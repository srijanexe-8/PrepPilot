"""Roadmap Generation Agent — produces a 15-day personalised interview prep plan."""
from __future__ import annotations

import json
from typing import Any, Dict, List

from langchain_core.messages import HumanMessage, SystemMessage

from src.prompts.roadmap_prompt import ROADMAP_SYSTEM_PROMPT
from src.utils.llm import get_llm
from src.utils.schemas import RoadmapPlan


class RoadmapAgent:
    """Generates a personalised 15-day interview preparation roadmap.

    Follows the same pattern as SkillMatcherAgent: synchronous `.run()` that
    returns a structured Pydantic model, intended to be called via `_run_in_thread`.
    """

    def __init__(self) -> None:
        self._llm = get_llm().with_structured_output(RoadmapPlan)

    def run(
        self,
        missing_skills: List[str],
        partial_skills: List[str],
        matched_skills: List[str],
        resume_data: Dict[str, Any],
        jd_data: Dict[str, Any],
        num_days: int = 15,
    ) -> RoadmapPlan:
        """Generate the roadmap and clamp/sort the result to `num_days` days."""

        # Build a rich context block for the LLM
        candidate_name = resume_data.get("name", "the candidate")
        role_title = jd_data.get("role_title", "the target role")

        # Summarise experience highlights for grounded behavioural questions
        experience_highlights: list[str] = []
        for exp in resume_data.get("experience", [])[:3]:
            role = exp.get("role", "")
            company = exp.get("company", "")
            duration = exp.get("duration", "")
            if role:
                experience_highlights.append(f"  • {role} at {company} ({duration})")

        project_highlights: list[str] = []
        for proj in resume_data.get("projects", [])[:3]:
            name = proj.get("name", "")
            techs = ", ".join(proj.get("technologies", [])[:4])
            if name:
                project_highlights.append(f"  • {name} [{techs}]")

        context = f"""CANDIDATE: {candidate_name}
TARGET ROLE: {role_title}

━━━━━━━━━━━━━━━━━━━━━━━
SKILL GAP ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━
Missing skills ({len(missing_skills)} — highest priority for days 1-7):
{json.dumps(missing_skills, indent=2)}

Partial/weak skills ({len(partial_skills)} — focus for days 8-11):
{json.dumps(partial_skills, indent=2)}

Matched/strong skills ({len(matched_skills)} — reinforce days 12-14):
{json.dumps(matched_skills, indent=2)}

━━━━━━━━━━━━━━━━━━━━━━━
CANDIDATE BACKGROUND (for grounded behavioural questions)
━━━━━━━━━━━━━━━━━━━━━━━
Experience:
{chr(10).join(experience_highlights) or "  (no structured experience found)"}

Projects:
{chr(10).join(project_highlights) or "  (no structured projects found)"}

JD Required Skills: {jd_data.get("required_skills", [])}
JD Preferred Skills: {jd_data.get("preferred_skills", [])}

Generate exactly {num_days} daily preparation items following the structure rules."""

        messages = [SystemMessage(content=ROADMAP_SYSTEM_PROMPT), HumanMessage(content=context)]
        result: RoadmapPlan = self._llm.invoke(messages)

        # Safety net: sort by day_number and clamp to num_days
        result.days.sort(key=lambda d: d.day_number)
        result.days = result.days[:num_days]

        return result
