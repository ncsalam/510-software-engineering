
import csv
import menu_recreator as mr

class _ChoiceMsg:
    def __init__(self, content):
        self.content = content
class _Choice:
    def __init__(self, content):
        self.message = _ChoiceMsg(content)
class _Resp:
    def __init__(self, content):
        self.choices = [_Choice(content)]

def test_recreate_menu_writes_csv_and_cleans_quotes(tmp_path, monkeypatch):
    """Test: writes cleaned CSV, removes blank/section lines."""
    llm_csv = (
        '"Burger","$10","Beef patty"\n'
        '\n'
        '"Fries","$3","Crispy"\n'
        'Section: Drinks,-,-\n'
    )
    def fake_create(**kwargs):
        return _Resp(llm_csv)
    monkeypatch.setattr(mr.client.chat.completions, "create", fake_create)

    out = tmp_path / "menu.csv"
    mr.recreate_menu("RAW TEXT IGNORED IN TEST", str(out))

    rows = list(csv.reader(out.read_text(encoding="utf-8").splitlines()))
    assert rows == [
        ["Burger", "$10", "Beef patty"],
        ["Fries", "$3", "Crispy"],
    ]

def test_recreate_menu_skips_section_rows_case_insensitive(tmp_path, monkeypatch):
    """Test: 'Section:' rows are dropped regardless of case."""
    class C:
        def __init__(self, content): self.content = content
    class Choice:
        def __init__(self, content): self.message = C(content)
    class Resp:
        def __init__(self, content): self.choices = [Choice(content)]

    llm_csv = "SeCtIoN: Sides,-,-\n" "Soup,$4,Hot\n"
    monkeypatch.setattr(mr.client.chat.completions, "create", lambda **_: Resp(llm_csv))
    out = tmp_path / "menu2.csv"
    mr.recreate_menu("ignored", str(out))
    rows = list(csv.reader(out.read_text(encoding="utf-8").splitlines()))
    assert rows == [["Soup", "$4", "Hot"]]
