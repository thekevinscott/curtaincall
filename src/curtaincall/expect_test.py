"""Unit tests for expect() polling and color matching logic."""

import pytest

from curtaincall.expect import _color_matches, _poll, _poll_negative


def describe_color_matches():

    def it_matches_exact_color():
        assert _color_matches("red", "red")

    def it_is_case_insensitive():
        assert _color_matches("Red", "red")
        assert _color_matches("RED", "red")

    def it_matches_alias_darkred_to_red():
        assert _color_matches("darkred", "red")

    def it_matches_alias_darkgreen_to_green():
        assert _color_matches("darkgreen", "green")

    def it_rejects_mismatched_colors():
        assert not _color_matches("red", "green")
        assert not _color_matches("blue", "red")

    def it_matches_default_color():
        assert _color_matches("default", "default")


def describe_poll():

    def it_returns_immediately_when_check_passes():
        _poll(lambda: True, timeout=1.0)

    def it_raises_on_timeout():
        with pytest.raises(AssertionError, match="timed out"):
            _poll(lambda: False, timeout=0.2, failure_message="timed out")

    def it_includes_screen_in_error():
        with pytest.raises(AssertionError, match="screen content here"):
            _poll(
                lambda: False,
                timeout=0.2,
                failure_message="fail",
                screen_fn=lambda: "screen content here",
            )

    def it_waits_for_condition_to_become_true():
        state = {"count": 0}

        def check():
            state["count"] += 1
            return state["count"] >= 3

        _poll(check, timeout=2.0, interval=0.05)
        assert state["count"] >= 3


def describe_poll_negative():

    def it_returns_immediately_when_check_is_false():
        _poll_negative(lambda: False, timeout=1.0)

    def it_raises_when_check_stays_true():
        with pytest.raises(AssertionError):
            _poll_negative(lambda: True, timeout=0.2, failure_message="still visible")
