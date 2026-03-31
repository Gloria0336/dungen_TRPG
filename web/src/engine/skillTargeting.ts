import type { Skill, SkillTargeting } from '../types';

export function getSkillTargeting(skill: Skill): SkillTargeting {
  if (skill.targeting) return skill.targeting;

  if (skill.hitRule.includes('自身')) return 'self';
  if (skill.effectSummary.includes('全體友方')) return 'ally_all';
  if (skill.effectSummary.includes('回復全體')) return 'ally_all';
  if (skill.effectSummary.includes('全體HP')) return 'ally_all';
  if (skill.effectSummary.includes('全體')) return 'enemy_all';
  if (skill.effectSummary.includes('範圍')) return 'enemy_all';
  if (skill.effectSummary.includes('回復') || skill.effectSummary.includes('治癒')) return 'ally_single';
  if (skill.hitRule.includes('必中')) return 'self';

  return 'enemy_single';
}

export function skillNeedsTargetSelection(skill: Skill): boolean {
  const targeting = getSkillTargeting(skill);
  return targeting === 'enemy_single' || targeting === 'ally_single';
}

export function isAllyTargetingSkill(skill: Skill): boolean {
  const targeting = getSkillTargeting(skill);
  return targeting === 'ally_single' || targeting === 'ally_all';
}
