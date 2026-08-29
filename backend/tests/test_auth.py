import pytest
from backend.app.auth import generate_manager_code, normalize_pin

def test_generate_manager_code():
    code = generate_manager_code()
    assert len(code) == 7
    assert code[3] == "-"
    p1, p2 = code.split("-")
    assert p1.isdigit() and len(p1) == 3
    assert p2.isdigit() and len(p2) == 3

def test_normalize_pin():
    assert normalize_pin("849-201") == "849-201"
    assert normalize_pin("849 201") == "849-201"
    assert normalize_pin("849201") == "849-201"
    assert normalize_pin(" 849-201 ") == "849-201"
