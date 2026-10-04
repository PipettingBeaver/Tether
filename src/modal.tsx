/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 tan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { plugins } from "@api/PluginManager";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Paragraph } from "@components/Paragraph";
import { openPluginModal } from "@components/settings";
import { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, useEffect, useRef, useState } from "@webpack/common";

import { delayFriend, delayFriends, delayText, forgetFriend, retetherFriend, untetherFriend } from "./actions";
import { openConversation, refreshConversations, refreshCurrentConversation, syncDMTimes } from "./dmTimes";
import { formatDaysAgo, FriendInfo, getOverdueFriends } from "./engine";
import { getFriends } from "./friends";
import settings from "./settings";
import { ensureStateLoaded, getState, patchFriendState, saveState } from "./state";

export function openTetherModal(focusId?: string) {
    openModal(props => (
        <ErrorBoundary>
            <TetherModal modalProps={props} focusId={focusId} />
        </ErrorBoundary>
    ));
}

export async function openTether(focusId?: string) {
    await ensureStateLoaded();
    await Promise.all([syncDMTimes(true), refreshCurrentConversation()]);
    openTetherModal(focusId);
}

function getOverdue() {
    return getOverdueFriends(getFriends(), getState(), settings.store);
}

function getMuted() {
    return getFriends().filter(friend => {
        const state = getState()[friend.id];
        return state?.muted && !state.forgotten;
    });
}

function getOpenableFriends(focusId?: string) {
    const overdue = getOverdue();
    if (!focusId) return overdue;

    const focus = overdue.find(friend => friend.id === focusId) ?? getFriends().find(friend => friend.id === focusId);
    return focus ? [focus, ...overdue.filter(friend => friend.id !== focus.id)] : overdue;
}

function openTetherSettings() {
    const plugin = Object.values(plugins).find(other => other.name === "Tether");
    if (plugin) openPluginModal(plugin);
}

function FriendDetails({ friend }: { friend: FriendInfo; }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 220px", minWidth: 220 }}>
            <img src={friend.avatarUrl} alt="" width={32} height={32} style={{ borderRadius: "50%" }} />
            <div style={{ minWidth: 0 }}>
                <div>{friend.name}</div>
                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {friend.lastMessageAt == null ? "No known messages" : `Last message ${formatDaysAgo(friend.lastMessageAt)}`}
                </div>
            </div>
        </div>
    );
}

export function TetherModal({ modalProps, focusId }: { modalProps: RenderModalProps; focusId?: string; }) {
    const [all, setAll] = useState(() => getOpenableFriends(focusId));
    const [hiddenIds, setHiddenIds] = useState(() => new Set<string>());
    const [muted, setMuted] = useState(getMuted);
    const refreshedBatch = useRef(false);

    const limit = Math.max(1, settings.store.dailyCheckIns);
    const delay = delayText(settings.store.delayDays);
    const visible = all.filter(friend => !hiddenIds.has(friend.id));
    const batch = visible.slice(0, limit);
    const waiting = Math.max(0, visible.length - limit);

    useEffect(() => {
        if (refreshedBatch.current) return;
        refreshedBatch.current = true;

        void refreshConversations(all.slice(0, limit)).then(() => setAll(getOpenableFriends(focusId)));
    }, [all, limit, focusId]);

    useEffect(() => {
        const now = Date.now();
        for (const friend of all.slice(0, limit)) patchFriendState(friend.id, { seenAt: now });
        void saveState();
    }, [all, limit]);

    function hide(id: string) {
        setHiddenIds(ids => new Set(ids).add(id));
    }

    function refresh() {
        setAll(getOverdue());
        setHiddenIds(new Set());
        setMuted(getMuted());
    }

    function delayAction(friend: FriendInfo) {
        delayFriend(friend);
        hide(friend.id);
    }

    function untether(friend: FriendInfo) {
        untetherFriend(friend);
        hide(friend.id);
        setMuted(list => [...list, friend]);
    }

    function retether(id: string) {
        retetherFriend(id);
        setMuted(list => list.filter(friend => friend.id !== id));
    }

    function forget(friend: FriendInfo) {
        forgetFriend(friend.id);
        setMuted(list => list.filter(other => other.id !== friend.id));
    }

    function message(friend: FriendInfo) {
        openConversation(friend);
        modalProps.onClose();
    }

    return (
        <Modal
            {...modalProps}
            title="Tether"
            size="lg"
            actions={[
                {
                    text: "Settings",
                    variant: "secondary",
                    onClick: () => {
                        modalProps.onClose();
                        openTetherSettings();
                    }
                },
                {
                    text: `Delay everyone (${delay})`,
                    variant: "secondary",
                    onClick: () => {
                        delayFriends(batch);
                        modalProps.onClose();
                    }
                },
                {
                    text: "Refresh Tethers",
                    variant: "primary",
                    onClick: refresh
                }
            ]}
        >
            <Flex flexDirection="column" gap="16px">
                {batch.length === 0 && (
                    <Paragraph>No missing tethers to check up on. No worries!</Paragraph>
                )}

                {batch.length > 0 && (
                    <Flex flexDirection="column" gap="12px">
                        {batch.map(friend => (
                            <Flex key={friend.id} alignItems="center" gap="12px" flexWrap="wrap">
                                <FriendDetails friend={friend} />
                                <Flex alignItems="center" gap="8px" flexWrap="wrap">
                                    <Button size="small" variant="secondary" onClick={() => message(friend)}>Message</Button>
                                    <Button size="small" variant="secondary" onClick={() => delayAction(friend)}>Delay Tether ({delay})</Button>
                                    <Button size="small" variant="dangerSecondary" onClick={() => untether(friend)}>Untether</Button>
                                </Flex>
                            </Flex>
                        ))}

                        {waiting > 0 && (
                            <Paragraph>{waiting} more friends are waiting for a future check-in.</Paragraph>
                        )}
                    </Flex>
                )}

                {muted.length > 0 && (
                    <Flex flexDirection="column" gap="12px">
                        <Paragraph>Untethered friends stay quiet until you tether them again.</Paragraph>
                        <div aria-label="Untethered friends" tabIndex={0} style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 128, overflowY: "auto" }}>
                            {muted.map(friend => (
                                <Flex key={friend.id} alignItems="center" gap="12px" flexWrap="wrap">
                                    <FriendDetails friend={friend} />
                                    <Flex alignItems="center" gap="8px" flexWrap="wrap">
                                        <Button size="small" variant="secondary" onClick={() => retether(friend.id)}>Retether</Button>
                                        <Button size="small" variant="dangerSecondary" onClick={() => forget(friend)}>Forget</Button>
                                    </Flex>
                                </Flex>
                            ))}
                        </div>
                    </Flex>
                )}
            </Flex>
        </Modal>
    );
}
