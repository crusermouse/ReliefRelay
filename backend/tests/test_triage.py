from ai.triage import score_triage

def test_critical_urgency_always_returns_red():
    assert score_triage(
        medical_urgency="critical",
        shelter_needed=False,
        food_needed=False,
        water_needed=False,
        family_members=1,
        special_needs=None
    ) == "RED"

def test_high_urgency_always_returns_orange():
    assert score_triage(
        medical_urgency="high",
        shelter_needed=False,
        food_needed=False,
        water_needed=False,
        family_members=1,
        special_needs=None
    ) == "ORANGE"

def test_medium_urgency_alone_returns_yellow():
    assert score_triage(
        medical_urgency="medium",
        shelter_needed=False,
        food_needed=False,
        water_needed=False,
        family_members=1,
        special_needs=None
    ) == "YELLOW"

def test_accumulation_reaches_orange():
    assert score_triage(
        medical_urgency="medium",
        shelter_needed=True,
        food_needed=True,
        water_needed=False,
        family_members=3,
        special_needs="Wheelchair"
    ) == "ORANGE"

def test_accumulation_reaches_yellow():
    assert score_triage(
        medical_urgency="none",
        shelter_needed=True,
        food_needed=True,
        water_needed=False,
        family_members=1,
        special_needs=None
    ) == "YELLOW"

def test_all_false_returns_green():
    assert score_triage(
        medical_urgency="none",
        shelter_needed=False,
        food_needed=False,
        water_needed=False,
        family_members=1,
        special_needs=None
    ) == "GREEN"

def test_special_needs_whitespace_not_counted():
    assert score_triage(
        medical_urgency="none",
        shelter_needed=True,
        food_needed=False,
        water_needed=False,
        family_members=1,
        special_needs="   "
    ) == "GREEN"

def test_special_needs_none_not_counted():
    assert score_triage(
        medical_urgency="none",
        shelter_needed=True,
        food_needed=False,
        water_needed=False,
        family_members=1,
        special_needs=None
    ) == "GREEN"

def test_family_members_below_threshold():
    assert score_triage(
        medical_urgency="none",
        shelter_needed=True,
        food_needed=False,
        water_needed=False,
        family_members=2,
        special_needs=None
    ) == "GREEN"

def test_family_members_at_threshold():
    assert score_triage(
        medical_urgency="none",
        shelter_needed=True,
        food_needed=False,
        water_needed=False,
        family_members=3,
        special_needs=None
    ) == "YELLOW"
