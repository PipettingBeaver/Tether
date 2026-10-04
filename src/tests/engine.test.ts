/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 tan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { countNudgedToday, DAY_MS, daysSince, EngineSettings, formatDaysAgo, FriendInfo, getOverdueFriends, HOUR_MS, isDue, MINUTE_MS, mostRecentNudgeAt, TetherState } from "../engine";

const NOW = 1_700_000_000_000;
const SETTINGS: EngineSettings = {
    thresholdDays: 7,
    extraDaysAfterMyMessage: 7,
    neverMessagedDays: 14,
    trackNeverMessaged: true,
    dailyCheckIns: 3,
    notificationCooldownHours: 6,
    listMode: "all",
    recentDays: 21,
    oldFriendsDays: 1095
};

function friend(id: string, lastMessageAt: number | null, friendsSince = NOW - 365 * DAY_MS): FriendInfo {
    return { id, name: id, avatarUrl: undefined, lastMessageAt, friendsSince };
}

test("daysSince counts whole days", () => {
    assert.equal(daysSince(NOW - 3 * DAY_MS, NOW), 3);
    assert.equal(daysSince(NOW - 3 * DAY_MS + 1, NOW), 2);
});

test("formatDaysAgo speaks like a person", () => {
    assert.equal(formatDaysAgo(NOW, NOW), "today");
    assert.equal(formatDaysAgo(NOW - DAY_MS, NOW), "1 day ago");
    assert.equal(formatDaysAgo(NOW - 3 * DAY_MS, NOW), "3 days ago");
});

test("recent friends are not due", () => {
    assert.equal(isDue(friend("a", NOW - DAY_MS), undefined, SETTINGS, NOW), false);
});

test("friends at or over the threshold are due", () => {
    assert.equal(isDue(friend("a", NOW - 7 * DAY_MS), undefined, SETTINGS, NOW), true);
});

test("friends you messaged last wait out the extra delay", () => {
    const spokenTo = (days: number) => ({ ...friend("a", NOW - days * DAY_MS), lastMessageFromMe: true });

    assert.equal(isDue(spokenTo(10), undefined, SETTINGS, NOW), false);
    assert.equal(isDue(spokenTo(14), undefined, SETTINGS, NOW), true);
});

test("friends who messaged last use the normal threshold", () => {
    const heardFrom = (days: number) => ({ ...friend("a", NOW - days * DAY_MS), lastMessageFromMe: false });

    assert.equal(isDue(heardFrom(7), undefined, SETTINGS, NOW), true);
});

test("unknown last author falls back to the normal threshold", () => {
    assert.equal(isDue(friend("a", NOW - 7 * DAY_MS), undefined, SETTINGS, NOW), true);
});

test("muted friends are never due", () => {
    assert.equal(isDue(friend("a", NOW - 30 * DAY_MS), { muted: true }, SETTINGS, NOW), false);
});

test("forgotten friends are never due", () => {
    assert.equal(isDue(friend("a", NOW - 30 * DAY_MS), { forgotten: true }, SETTINGS, NOW), false);
});

test("snoozed friends wait until the snooze expires", () => {
    const state = { notBefore: NOW + 5 * MINUTE_MS };

    assert.equal(isDue(friend("a", NOW - 30 * DAY_MS), state, SETTINGS, NOW), false);
    assert.equal(isDue(friend("a", NOW - 30 * DAY_MS), state, SETTINGS, NOW + 5 * MINUTE_MS), true);
});

test("never messaged friends wait out the grace period", () => {
    const withinGrace = friend("a", null, NOW - 13 * DAY_MS);
    const pastGrace = friend("a", null, NOW - 14 * DAY_MS);

    assert.equal(isDue(withinGrace, undefined, SETTINGS, NOW), false);
    assert.equal(isDue(pastGrace, undefined, SETTINGS, NOW), true);
});

test("never messaged friends are skipped when the setting is off", () => {
    const pastGrace = friend("a", null, NOW - 100 * DAY_MS);

    assert.equal(isDue(pastGrace, undefined, { ...SETTINGS, trackNeverMessaged: false }, NOW), false);
});

test("friends switched off are excluded in everyone mode", () => {
    assert.equal(isDue(friend("a", NOW - 30 * DAY_MS), { tracked: false }, SETTINGS, NOW), false);
});

test("whitelist mode only includes friends switched on", () => {
    const whitelist: EngineSettings = { ...SETTINGS, listMode: "whitelist" };

    assert.equal(isDue(friend("a", NOW - 30 * DAY_MS), undefined, whitelist, NOW), false);
    assert.equal(isDue(friend("a", NOW - 30 * DAY_MS), { tracked: true }, whitelist, NOW), true);
});

test("recent mode ignores friends outside the recent window", () => {
    const recent: EngineSettings = { ...SETTINGS, listMode: "recent" };

    assert.equal(isDue(friend("a", NOW - 30 * DAY_MS), undefined, recent, NOW), false);
    assert.equal(isDue(friend("a", NOW - 10 * DAY_MS), undefined, recent, NOW), true);
});

test("old friends mode reaches back years but not forever", () => {
    const old: EngineSettings = { ...SETTINGS, listMode: "old" };

    assert.equal(isDue(friend("a", NOW - 730 * DAY_MS), undefined, old, NOW), true);
    assert.equal(isDue(friend("a", NOW - 1500 * DAY_MS), undefined, old, NOW), false);
});

test("muted friends stay excluded in whitelist mode", () => {
    const whitelist: EngineSettings = { ...SETTINGS, listMode: "whitelist" };

    assert.equal(isDue(friend("a", NOW - 30 * DAY_MS), { tracked: true, muted: true }, whitelist, NOW), false);
});

test("overdue friends are sorted by longest silence first", () => {
    const friends = [
        friend("recent", NOW - 8 * DAY_MS),
        friend("never", null, NOW - 100 * DAY_MS),
        friend("ancient", NOW - 60 * DAY_MS),
        friend("fresh", NOW - DAY_MS)
    ];
    const overdue = getOverdueFriends(friends, {}, SETTINGS, NOW);

    assert.deepEqual(overdue.map(f => f.id), ["never", "ancient", "recent"]);
});

test("muted friends are left out of the overdue list", () => {
    const friends = [friend("recent", NOW - 8 * DAY_MS), friend("ancient", NOW - 60 * DAY_MS)];
    const state: TetherState = { ancient: { muted: true } };
    const overdue = getOverdueFriends(friends, state, SETTINGS, NOW);

    assert.deepEqual(overdue.map(f => f.id), ["recent"]);
});

test("only friends nudged today count toward the daily limit", () => {
    const friends = [friend("a", NOW - 30 * DAY_MS), friend("b", NOW - 30 * DAY_MS)];
    const state: TetherState = {
        a: { lastNudgedAt: NOW },
        b: { lastNudgedAt: NOW - DAY_MS }
    };

    assert.equal(countNudgedToday(friends, state, NOW), 1);
});

test("most recent nudge tracks the latest notification", () => {
    const friends = [friend("a", NOW - 30 * DAY_MS), friend("b", NOW - 30 * DAY_MS)];
    const state: TetherState = {
        a: { lastNudgedAt: NOW - HOUR_MS },
        b: { lastNudgedAt: NOW - 6 * HOUR_MS }
    };

    assert.equal(mostRecentNudgeAt(friends, state), NOW - HOUR_MS);
});
