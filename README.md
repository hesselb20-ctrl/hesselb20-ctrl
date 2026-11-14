# Hessel

Twelve prototypes in sensing, signals and agent tooling. Each README opens with a figure built from that project's own results, and says what is verified, what is simulated and what has not been run.

## Sensing and signals

<table>
<tr>
<td width="50%" valign="top"><a href="https://github.com/hesselb20-ctrl/quakescore"><img src="figures/quakescore.png" width="100%" alt="QuakeScore: figure from the repository README"></a><br><b><a href="https://github.com/hesselb20-ctrl/quakescore">QuakeScore</a></b><br>Seismic vulnerability screening from phones at rest.<br><sub>Research prototype · simulation only</sub></td>
<td width="50%" valign="top"><a href="https://github.com/hesselb20-ctrl/quakescore-collector"><img src="figures/quakescore-collector.png" width="100%" alt="QuakeScore Collector: figure from the repository README"></a><br><b><a href="https://github.com/hesselb20-ctrl/quakescore-collector">QuakeScore Collector</a></b><br>Measures building vibration in a phone's browser.<br><sub>Prototype · simulated input only</sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://github.com/hesselb20-ctrl/spoofnet"><img src="figures/spoofnet.png" width="100%" alt="SpoofNet: figure from the repository README"></a><br><b><a href="https://github.com/hesselb20-ctrl/spoofnet">SpoofNet</a></b><br>GNSS jamming and spoofing, mapped from phones.<br><sub>Research prototype · replay-tested</sub></td>
<td width="50%" valign="top"><a href="https://github.com/hesselb20-ctrl/ghost-channel"><img src="figures/ghost-channel.png" width="100%" alt="Ghost Channel: figure from the repository README"></a><br><b><a href="https://github.com/hesselb20-ctrl/ghost-channel">Ghost Channel</a></b><br>Sends data to a camera as faint screen flicker.<br><sub>Prototype · no phone tested yet</sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://github.com/hesselb20-ctrl/liveseal"><img src="figures/liveseal.png" width="100%" alt="LiveSeal: figure from the repository README"></a><br><b><a href="https://github.com/hesselb20-ctrl/liveseal">LiveSeal</a></b><br>A signed seal in live video, checked by the receiver.<br><sub>Research preview · no real call yet</sub></td>
<td width="50%"></td>
</tr>
</table>

## Agent tooling

<table>
<tr>
<td width="50%" valign="top"><a href="https://github.com/hesselb20-ctrl/glassbox"><img src="figures/glassbox.png" width="100%" alt="Glassbox: figure from the repository README"></a><br><b><a href="https://github.com/hesselb20-ctrl/glassbox">Glassbox</a></b><br>An interpretability lab Claude Code drives over MCP.<br><sub>Research prototype · v0.1.0</sub></td>
<td width="50%" valign="top"><a href="https://github.com/hesselb20-ctrl/cea"><img src="figures/cea.png" width="100%" alt="cea: figure from the repository README"></a><br><b><a href="https://github.com/hesselb20-ctrl/cea">cea</a></b><br>Makes coding agents prove compiler claims.<br><sub>Prototype v0.1.0 · partly verified</sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://github.com/hesselb20-ctrl/tracekit"><img src="figures/tracekit.png" width="100%" alt="tracekit: figure from the repository README"></a><br><b><a href="https://github.com/hesselb20-ctrl/tracekit">tracekit</a></b><br>HAR recording in. OpenAPI spec, SDK and MCP server out.<br><sub>Prototype · one local demo API</sub></td>
<td width="50%" valign="top"><a href="https://github.com/hesselb20-ctrl/backstory"><img src="figures/backstory.png" width="100%" alt="Backstory: figure from the repository README"></a><br><b><a href="https://github.com/hesselb20-ctrl/backstory">Backstory</a></b><br>Rebuilds the decisions behind code from its git history.<br><sub>Prototype · v0.1.0 · not on npm</sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://github.com/hesselb20-ctrl/outside-in"><img src="figures/outside-in.png" width="100%" alt="Outside-In: figure from the repository README"></a><br><b><a href="https://github.com/hesselb20-ctrl/outside-in">Outside-In</a></b><br>Evidence-backed company profiles from public signals.<br><sub>Prototype · v0.1.0 · not on npm</sub></td>
<td width="50%"></td>
</tr>
</table>

## Media and CAD

<table>
<tr>
<td width="50%" valign="top"><a href="https://github.com/hesselb20-ctrl/shotlist"><img src="figures/shotlist.png" width="100%" alt="shotlist: figure from the repository README"></a><br><b><a href="https://github.com/hesselb20-ctrl/shotlist">shotlist</a></b><br>Shot list and Remotion template from a short video.<br><sub>Prototype · tested on one synthetic clip</sub></td>
<td width="50%" valign="top"><a href="https://github.com/hesselb20-ctrl/caliper"><img src="figures/caliper.png" width="100%" alt="Caliper: figure from the repository README"></a><br><b><a href="https://github.com/hesselb20-ctrl/caliper">Caliper</a></b><br>Parametric CAD from photos and one measurement.<br><sub>Prototype · synthetic test only</sub></td>
</tr>
</table>

The sources for the figures (Remotion and React Three Fiber scenes and the shared chart kit) are in [`design/`](design).
