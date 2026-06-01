"""Final session feedback without Gemini — aggregates per-answer scores."""


def build_session_coaching(
    answers: list[dict],
    role: str,
    overall_score: float,
) -> dict:
    """
    Coaching text for the Feedback page when no AI session summary exists.
    answers: list of {tag, score, strengths, improvements, question}
    """
    if not answers:
        return {
            "headline": "Session complete",
            "coaching": "You finished the round. Run another session after practicing STAR format with metrics.",
            "focus_areas": [],
            "degraded": False,
        }

    tag_scores: dict[str, list[int]] = {}
    all_improvements: list[str] = []

    for a in answers:
        tag = a.get("tag", "GENERAL")
        tag_scores.setdefault(tag, []).append(int(a.get("score", 5)))
        for imp in a.get("improvements") or []:
            if imp and imp not in all_improvements:
                all_improvements.append(str(imp))

    avg_by_tag = {
        tag: round(sum(scores) / len(scores), 1)
        for tag, scores in tag_scores.items()
    }
    weakest_tag = min(avg_by_tag, key=avg_by_tag.get) if avg_by_tag else None
    strongest_tag = max(avg_by_tag, key=avg_by_tag.get) if avg_by_tag else None

    degraded = any(a.get("degraded") or a.get("evalDegraded") for a in answers)

    if overall_score >= 8:
        headline = "Strong session — keep polishing edge cases"
    elif overall_score >= 6:
        headline = "Solid foundation — deepen proof and metrics"
    elif overall_score >= 4:
        headline = "Good practice — focus on structure and specifics"
    else:
        headline = "Keep practicing — aim for longer, resume-specific answers"

    parts = [
        f"Overall {overall_score}/10 for {role}.",
    ]
    if strongest_tag:
        parts.append(f"Strongest area: {strongest_tag} ({avg_by_tag[strongest_tag]}/10).")
    if weakest_tag and weakest_tag != strongest_tag:
        parts.append(f"Priority focus: {weakest_tag} ({avg_by_tag[weakest_tag]}/10).")

    if all_improvements:
        parts.append(f"Top improvement: {all_improvements[0]}")

    if degraded:
        parts.append(
            "Some scores used offline estimation because the AI API was unavailable — "
            "your numeric breakdown is still valid for practice.",
        )

    focus = []
    if weakest_tag:
        focus.append(weakest_tag)
    if all_improvements:
        focus.append(all_improvements[0][:80])

    return {
        "headline": headline,
        "coaching": " ".join(parts),
        "focus_areas": focus[:3],
        "degraded": degraded,
    }
