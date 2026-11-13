# Writes README.md for the profile repository from the group lists below.
A = ".github/assets"
U = "https://github.com/hesselb20-ctrl/"
GROUPS = [
    ("Sensing and signals", "Measurement from ordinary phones and screens. All validated in simulation or replay so far.",
     ["quakescore", "quakescore-collector", "spoofnet", "ghost-channel", "liveseal"]),
    ("Agent tooling", "Tools that make coding and research agents show their evidence.",
     ["glassbox", "cea", "tracekit", "backstory", "outside-in"]),
    ("Media and CAD", "Turning footage and photos into editable structure.",
     ["shotlist", "caliper"]),
]
ALT = {
    "quakescore": "QuakeScore. Seismic vulnerability screening from phones at rest. Research prototype, simulation only.",
    "quakescore-collector": "QuakeScore Collector. Measures building vibration in a phone's browser. Prototype, simulated input only.",
    "spoofnet": "SpoofNet. GNSS jamming and spoofing, mapped from phones. Research prototype, replay-tested.",
    "ghost-channel": "Ghost Channel. Sends data to a camera as faint screen flicker. Prototype, no phone tested yet.",
    "liveseal": "LiveSeal. A signed seal in live video, checked by the receiver. Research preview, no real call yet.",
    "glassbox": "Glassbox. An interpretability lab Claude Code drives over MCP. Research prototype.",
    "cea": "cea. Makes coding agents prove compiler claims. Prototype, partly verified.",
    "tracekit": "tracekit. HAR recording in, OpenAPI spec, SDK and MCP server out. Prototype, one local demo API.",
    "backstory": "Backstory. Rebuilds the decisions behind code from its git history. Prototype.",
    "outside-in": "Outside-In. Evidence-backed company profiles from public signals. Prototype.",
    "shotlist": "shotlist. Shot list and Remotion template from a short video. Prototype, tested on one synthetic clip.",
    "caliper": "Caliper. Parametric CAD from photos and one measurement. Prototype, synthetic test only.",
}


def pic(base, alt, mobile):
    s = "<picture>\n"
    if mobile:
        s += f'  <source media="(max-width: 600px) and (prefers-color-scheme: dark)" srcset="{A}/{mobile}-dark.svg">\n'
        s += f'  <source media="(max-width: 600px)" srcset="{A}/{mobile}-light.svg">\n'
    ext = "gif" if base == "scene" else "svg"
    s += f'  <source media="(prefers-color-scheme: dark)" srcset="{A}/{base}-dark.{ext}">\n'
    s += f'  <img src="{A}/{base}-light.{ext}" width="100%" alt="{alt}">\n</picture>\n'
    return s


out = pic("hero", "Hessel. Prototypes in sensing, signals and agent tooling. Twelve repositories, all prototypes.", "hero-mobile") + "\n"
out += ("Twelve repositories, all prototypes. Each README says what was verified, what was only simulated\n"
        "and what has not been run at all.\n\n")
out += pic("scene", "3D index: twelve slabs in three rows, one per repository, lighting up one after another.", None) + "\n"
for i, (title, blurb, names) in enumerate(GROUPS, 1):
    out += pic(f"rule-0{i}", f"0{i} {title}", f"rule-mobile-0{i}") + "\n" + blurb + "\n\n"
    for n in names:
        out += f'<a href="{U}{n}">\n' + pic(f"card-{n}", ALT[n], f"card-{n}-mobile") + "</a>\n\n"
out += pic("rule-04", "04 Conventions", "rule-mobile-04") + "\n"
out += """Every repository follows the same layout and the same rules.

- **Structure.** What it is, why it exists, how it works, capabilities, quick start, stack and status, license.
- **Claims.** Each one traces to code, tests or a recorded result in the repository. No benchmarks without a source.
- **Status.** Stated in the header of every README. Simulated, synthetic and replayed results are labelled as such.
- **Quick start.** Only commands that were run, with the result that was seen.
- **Visuals.** Monochrome. Animated SVG and one 3D loop per repository, drawn from that repository's own data.

The design system and scene sources are in [`design/`](design).
"""
open("README.md", "w", encoding="utf8", newline="\n").write(out)
print(len(out.split()), "words")
