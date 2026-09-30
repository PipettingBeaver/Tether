/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 tan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { Paragraph } from "@components/Paragraph";
import { Switch } from "@components/Switch";
import { TextInput, useState } from "@webpack/common";

import { getBackfillQueueSize, runBackfillStep } from "./backfill";
import { getDMSyncStatus, openConversation, rememberLoadedChannels, syncDMTimes } from "./dmTimes";
import { countNudgedToday, DAY_MS, formatDaysAgo, FriendInfo, FriendState, HOUR_MS, isTracked, ListMode, MINUTE_MS, mostRecentNudgeAt } from "./engine";
import { ExcludedFriend, getFriendGroups } from "./friends";
import { dismissTetherNotice } from "./notices";
import { getState, patchFriendState, saveState } from "./state";

function isChecked(state: FriendState | undefined, mode: ListMode) {
    if (state?.muted || state?.forgotten) return false;
    if (mode === "whitelist") return state?.tracked === true;
    return state?.tracked !== false;
}

function isWithinDays(friend: FriendInfo, days: number) {
    return friend.lastMessageAt != null && Date.now() - friend.lastMessageAt <= days * DAY_MS;
}

function describeFriend(friend: FriendInfo, mode: ListMode, recentDays: number, oldFriendsDays: number) {
    const state = getState()[friend.id];
    if (state?.forgotten) return "Forgotten";
    if (state?.muted) return "Untethered";

    const label = friend.lastMessageAt == null
        ? state?.checkedAt ? "Checked, no messages" : "No known messages"
        : `Last message ${formatDaysAgo(friend.lastMessageAt)}`;
    if (mode === "recent" && !isWithinDays(friend, recentDays)) return `${label}, outside the recent window`;
    if (mode === "old" && !isWithinDays(friend, oldFriendsDays)) return `${label}, outside the old friends window`;

    return label;
}

function describeExclusions(excluded: ExcludedFriend[]) {
    const reasons = [...new Set(excluded.map(entry => entry.reason))];
    const names = excluded.map(entry => entry.info.name).join(", ");

    return `${excluded.length} friends are hidden (${reasons.join(" or ")}): ${names}`;
}

function formatDuration(ms: number) {
    const totalMinutes = Math.ceil(ms / MINUTE_MS);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) return `${minutes}m`;
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export default function FriendManager() {
    const [groups, setGroups] = useState(getFriendGroups);
    const [status, setStatus] = useState(getDMSyncStatus);
    const [syncing, setSyncing] = useState(false);
    const [checkingOne, setCheckingOne] = useState(false);
    const [, setVersion] = useState(0);
    const [search, setSearch] = useState("");
    const store = useSettings();

    const mode = store.plugins.Tether.listMode as ListMode;
    const recentDays = store.plugins.Tether.recentDays as number;
    const oldFriendsDays = store.plugins.Tether.oldFriendsDays as number;
    const cooldownHours = store.plugins.Tether.notificationCooldownHours as number;
    const dailyCheckIns = store.plugins.Tether.dailyCheckIns as number;

    function setTracked(id: string, tracked: boolean) {
        patchFriendState(id, tracked ? { tracked: true, muted: false, forgotten: false } : { tracked: false });
        if (!tracked) dismissTetherNotice(id);
        void saveState();
        setVersion(version => version + 1);
    }

    async function syncNow() {
        setSyncing(true);
        await syncDMTimes(true);
        await rememberLoadedChannels();
        setGroups(getFriendGroups());
        setStatus(getDMSyncStatus());
        setSyncing(false);
    }

    async function checkOne() {
        setCheckingOne(true);
        await runBackfillStep(true);
        setGroups(getFriendGroups());
        setStatus(getDMSyncStatus());
        setCheckingOne(false);
    }

    const query = search.trim().toLowerCase();
    const visible = groups.trackable.filter(friend => friend.name.toLowerCase().includes(query));

    const state = getState();
    const now = Date.now();
    const knownCount = groups.trackable.filter(friend => friend.lastMessageAt != null).length;
    const checkedCount = groups.trackable.filter(friend => friend.lastMessageAt == null && state[friend.id]?.checkedAt).length;
    const trackedCount = groups.trackable.filter(friend => isTracked(friend, state[friend.id], { listMode: mode, recentDays, oldFriendsDays }, now)).length;
    const nudgedToday = countNudgedToday(groups.trackable, state, now);
    const latestNudge = mostRecentNudgeAt(groups.trackable, state);
    const cooldownLeft = latestNudge === 0 ? 0 : Math.max(0, latestNudge + cooldownHours * HOUR_MS - now);

    return (
        <>
            <Flex alignItems="center" gap="8px" flexWrap="wrap">
                <Button size="small" variant="secondary" disabled={syncing} onClick={() => void syncNow()}>
                    {syncing ? "Syncing..." : "Sync with Discord"}
                </Button>
                <Button size="small" variant="secondary" disabled={checkingOne} onClick={() => void checkOne()}>
                    {checkingOne ? "Checking..." : "Check one now"}
                </Button>
                <Paragraph>Open or search a chat once and Tether will remember it.</Paragraph>
            </Flex>

            <Paragraph>Backfill queue: {getBackfillQueueSize()} friends waiting.</Paragraph>

            <Paragraph>Switch someone off to leave them out.</Paragraph>

            <TextInput value={search} onChange={setSearch} placeholder="Search friends" />

            <div aria-label="Tether friend list" tabIndex={0} style={{ maxHeight: 320, overflowY: "auto", margin: "8px 0" }}>
                {visible.length === 0
                    ? <Paragraph>No friends match that search.</Paragraph>
                    : visible.map(friend => (
                        <div
                            key={friend.id}
                            style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--background-modifier-accent)" }}
                        >
                            <div style={{ flexGrow: 1, minWidth: 0 }}>
                                <div>{friend.name}</div>
                                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{describeFriend(friend, mode, recentDays, oldFriendsDays)}</div>
                            </div>
                            {friend.lastMessageAt == null && (
                                <Button size="small" variant="secondary" onClick={() => openConversation(friend)}>Open</Button>
                            )}
                            <Switch
                                aria-label={`Watch ${friend.name}`}
                                checked={isChecked(getState()[friend.id], mode)}
                                onChange={tracked => setTracked(friend.id, tracked)}
                            />
                        </div>
                    ))}
            </div>

            <Paragraph>Tether is watching {trackedCount} friends. Check-ins today: {nudgedToday} of {dailyCheckIns}.{cooldownLeft > 0 ? ` Next one possible in ${formatDuration(cooldownLeft)}.` : ""}</Paragraph>
            <Paragraph>Known message history: {knownCount} of {groups.trackable.length} friends. Checked, no messages: {checkedCount}. DM channels loaded: {status.loaded}, mapped: {status.mapped}. Timestamps cached: {status.cached}.{status.lastSyncCount != null ? ` Last sync found ${status.lastSyncCount} DM channels.` : ""}{status.lastError ? ` Last error: ${status.lastError}` : ""}</Paragraph>
            {groups.excluded.length > 0 && <Paragraph>{describeExclusions(groups.excluded)}</Paragraph>}
        </>
    );
}
