from dataclasses import dataclass


@dataclass
class SplunkQueryTemplate:
    name: str
    description: str
    spl: str
    agent_use: str


SPLUNK_QUERY_TEMPLATES = {
    "verify_botsv3": SplunkQueryTemplate(
        name="verify_botsv3",
        description="Verify that BOTS v3 is installed and searchable.",
        spl='index=botsv3 earliest=0 | head 10',
        agent_use="Health-check Splunk evidence availability before investigation."
    ),

    "sourcetype_inventory": SplunkQueryTemplate(
        name="sourcetype_inventory",
        description="List available telemetry sourcetypes in BOTS v3.",
        spl="""
index=botsv3 earliest=0
| stats count by sourcetype
| sort -count
""".strip(),
        agent_use="Understand what evidence types Splunk can provide."
    ),

    "host_inventory": SplunkQueryTemplate(
        name="host_inventory",
        description="List hosts/assets available in BOTS v3.",
        spl="""
index=botsv3 earliest=0
| stats count by host
| sort -count
""".strip(),
        agent_use="Identify assets that can appear in the investigation timeline."
    ),

    "sample_security_events": SplunkQueryTemplate(
        name="sample_security_events",
        description="Return sample security/telemetry events for evidence timeline.",
        spl="""
index=botsv3 earliest=0
| table _time host sourcetype source
| head 20
""".strip(),
        agent_use="Attach sample Splunk evidence to a RavenLedger risk case."
    ),

    "security_event_by_sourcetype": SplunkQueryTemplate(
        name="security_event_by_sourcetype",
        description="Fetch security events for a selected sourcetype.",
        spl="""
index=botsv3 earliest=0 sourcetype="{sourcetype}"
| table _time host sourcetype source
| head {limit}
""".strip(),
        agent_use="Let the agent investigate a selected telemetry type."
    ),
}


def get_query_template(name: str) -> SplunkQueryTemplate:
    if name not in SPLUNK_QUERY_TEMPLATES:
        available = ", ".join(SPLUNK_QUERY_TEMPLATES.keys())
        raise KeyError(f"Unknown query template: {name}. Available: {available}")

    return SPLUNK_QUERY_TEMPLATES[name]


def render_query(name: str, **kwargs) -> str:
    template = get_query_template(name)
    return template.spl.format(**kwargs)


def list_templates() -> list[dict]:
    return [
        {
            "name": template.name,
            "description": template.description,
            "spl": template.spl,
            "agent_use": template.agent_use,
        }
        for template in SPLUNK_QUERY_TEMPLATES.values()
    ]


if __name__ == "__main__":
    print("RavenLedger Splunk Query Templates")
    print("=" * 70)

    for template in list_templates():
        print(f"\nName: {template['name']}")
        print(f"Description: {template['description']}")
        print(f"Agent Use: {template['agent_use']}")
        print("SPL:")
        print(template["spl"])

    print("\nRendered parameterized example:")
    print(
        render_query(
            "security_event_by_sourcetype",
            sourcetype="stream:ip",
            limit=10
        )
    )