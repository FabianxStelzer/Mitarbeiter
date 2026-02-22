import { CandidateProfile, CompanyProfile, JobPosting, VisibilityStatus } from "@prisma/client";
import { parseJsonArray } from "@/lib/json";

export type CandidateSearchFilters = {
  skills?: string[];
  location?: string;
  minExperienceYears?: number;
  maxSalary?: number;
  minSalary?: number;
  availability?: string;
  query?: string;
};

export function getCandidateSkills(candidate: CandidateProfile): string[] {
  return parseJsonArray<string>(candidate.skillsJson).map((skill) => skill.trim()).filter(Boolean);
}

function getCandidatePreferredLocations(candidate: CandidateProfile): string[] {
  return parseJsonArray<string>(candidate.preferredLocationsJson)
    .map((location) => location.trim())
    .filter(Boolean);
}

function getBlockedCompanyIds(candidate: CandidateProfile): string[] {
  return parseJsonArray<string>(candidate.blockedCompanyIdsJson);
}

function getBlockedManagerEmails(candidate: CandidateProfile): string[] {
  return parseJsonArray<string>(candidate.blockedManagerEmailsJson).map((email) => email.toLowerCase());
}

function textIncludes(haystack: string | null | undefined, needle: string): boolean {
  if (!haystack) {
    return false;
  }

  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function equalsInsensitive(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left || !right) {
    return false;
  }

  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function isCandidateVisibleToCompany(
  candidate: CandidateProfile,
  company: CompanyProfile,
): boolean {
  if (candidate.visibility === VisibilityStatus.HIDDEN) {
    return false;
  }

  if (getBlockedCompanyIds(candidate).includes(company.id)) {
    return false;
  }

  if (
    company.managingDirectorEmail &&
    getBlockedManagerEmails(candidate).includes(company.managingDirectorEmail.toLowerCase())
  ) {
    return false;
  }

  if (
    candidate.hideFromCurrentEmployer &&
    candidate.currentEmployer &&
    (equalsInsensitive(candidate.currentEmployer, company.companyName) ||
      equalsInsensitive(candidate.currentEmployer, company.legalName))
  ) {
    return false;
  }

  return true;
}

export function matchesCompanyFilters(
  candidate: CandidateProfile,
  filters: CandidateSearchFilters,
): boolean {
  const skills = getCandidateSkills(candidate);
  const preferredLocations = getCandidatePreferredLocations(candidate);
  const lowerSkills = skills.map((skill) => skill.toLowerCase());
  const query = filters.query?.trim().toLowerCase();

  if (filters.skills?.length) {
    const required = filters.skills.map((skill) => skill.toLowerCase());
    const hasAllRequired = required.every((skill) => lowerSkills.includes(skill));
    if (!hasAllRequired) {
      return false;
    }
  }

  if (filters.location) {
    const locationFilter = filters.location;
    const locationMatch =
      textIncludes(candidate.location, locationFilter) ||
      preferredLocations.some((location) => textIncludes(location, locationFilter));
    if (!locationMatch) {
      return false;
    }
  }

  if (
    typeof filters.minExperienceYears === "number" &&
    candidate.experienceYears < filters.minExperienceYears
  ) {
    return false;
  }

  if (typeof filters.maxSalary === "number" && candidate.salaryMin && candidate.salaryMin > filters.maxSalary) {
    return false;
  }

  if (typeof filters.minSalary === "number" && candidate.salaryMax && candidate.salaryMax < filters.minSalary) {
    return false;
  }

  if (filters.availability && !textIncludes(candidate.availabilityNote, filters.availability)) {
    return false;
  }

  if (query) {
    const queryMatch =
      textIncludes(candidate.firstName, query) ||
      textIncludes(candidate.lastName, query) ||
      textIncludes(candidate.headline, query) ||
      textIncludes(candidate.summary, query) ||
      lowerSkills.some((skill) => skill.includes(query));

    if (!queryMatch) {
      return false;
    }
  }

  return true;
}

function getSkillOverlapScore(candidateSkills: string[], requiredSkills: string[]): number {
  if (!requiredSkills.length) {
    return 0.6;
  }

  const lowerCandidate = candidateSkills.map((skill) => skill.toLowerCase());
  const lowerRequired = requiredSkills.map((skill) => skill.toLowerCase());
  const matches = lowerRequired.filter((skill) => lowerCandidate.includes(skill)).length;
  return matches / lowerRequired.length;
}

function getLocationScore(candidate: CandidateProfile, job: JobPosting): number {
  if (job.isRemote) {
    return 1;
  }

  if (!job.location) {
    return 0.7;
  }

  const jobLocation = job.location;
  const preferredLocations = getCandidatePreferredLocations(candidate);
  if (
    textIncludes(candidate.location, jobLocation) ||
    preferredLocations.some((location) => textIncludes(location, jobLocation))
  ) {
    return 1;
  }

  return 0.2;
}

function getSalaryScore(candidate: CandidateProfile, job: JobPosting): number {
  if (!job.salaryMin && !job.salaryMax) {
    return 0.6;
  }

  if (!candidate.salaryMin && !candidate.salaryMax) {
    return 0.6;
  }

  const candidateMin = candidate.salaryMin ?? 0;
  const candidateMax = candidate.salaryMax ?? Number.MAX_SAFE_INTEGER;
  const jobMin = job.salaryMin ?? 0;
  const jobMax = job.salaryMax ?? Number.MAX_SAFE_INTEGER;
  const overlap = candidateMin <= jobMax && candidateMax >= jobMin;

  return overlap ? 1 : 0;
}

function getAvailabilityScore(candidate: CandidateProfile, job: JobPosting): number {
  if (!job.availabilityNote || !candidate.availabilityNote) {
    return 0.7;
  }

  return textIncludes(candidate.availabilityNote, job.availabilityNote) ? 1 : 0.3;
}

export function calculateCandidateJobScore(candidate: CandidateProfile, job: JobPosting): number {
  const requiredSkills = parseJsonArray<string>(job.requiredSkillsJson);
  const candidateSkills = getCandidateSkills(candidate);
  const skillScore = getSkillOverlapScore(candidateSkills, requiredSkills);
  const experienceScore = Math.min(
    1,
    candidate.experienceYears / Math.max(job.minExperienceYears || 1, 1),
  );
  const locationScore = getLocationScore(candidate, job);
  const salaryScore = getSalaryScore(candidate, job);
  const availabilityScore = getAvailabilityScore(candidate, job);

  const weightedScore =
    skillScore * 0.4 +
    experienceScore * 0.2 +
    locationScore * 0.15 +
    salaryScore * 0.15 +
    availabilityScore * 0.1;

  return Math.round(weightedScore * 100);
}

export function rankCandidatesForCompany(
  company: CompanyProfile,
  candidates: CandidateProfile[],
  jobs: JobPosting[],
) {
  return candidates
    .filter((candidate) => isCandidateVisibleToCompany(candidate, company))
    .map((candidate) => {
      const jobScores = jobs
        .filter((job) => job.active)
        .map((job) => calculateCandidateJobScore(candidate, job));
      const bestScore = jobScores.length ? Math.max(...jobScores) : 0;
      return {
        candidate,
        score: bestScore,
      };
    })
    .sort((left, right) => right.score - left.score);
}

export function rankJobsForCandidate(candidate: CandidateProfile, jobs: (JobPosting & { company: CompanyProfile })[]) {
  return jobs
    .filter((job) => job.active)
    .map((job) => ({
      job,
      score: calculateCandidateJobScore(candidate, job),
    }))
    .filter((entry) => entry.score >= 35)
    .sort((left, right) => right.score - left.score);
}
