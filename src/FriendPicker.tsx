/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 tan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Paragraph } from "@components/Paragraph";
import { Switch } from "@components/Switch";
import { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, TextInput, useEffect, useRef, useState } from "@webpack/common";

import { formatDaysAgo, FriendInfo } from "./engine";
import { getFriendGroups } from "./friends";
import { getState, patchFriendState, saveState } from "./state";

function describeFriend(friend: FriendInfo) {
    const state = getState()[friend.id];
    if (state?.muted) return "Untethered";
    if (friend.lastMessageAt == null) return "No known messages";

    return `Last message ${formatDaysAgo(friend.lastMessageAt)}`;
}

export function FriendChecklist({ onCountChange }: { onCountChange?: (count: number) => void; }) {
    const [groups] = useState(getFriendGroups);
    const [, setVersion] = useState(0);
    const [search, setSearch] = useState("");

    const selectedCount = groups.trackable.filter(friend => isWatched(friend.id)).length;
    const hasFriends = groups.trackable.length > 0;

    useEffect(() => {
        onCountChange?.(selectedCount);
    }, [selectedCount, onCountChange]);

    function isWatched(id: string) {
        const state = getState()[id];
        return state?.tracked === true && !state.muted;
    }

    function setTracked(id: string, tracked: boolean) {
        patchFriendState(id, tracked ? { tracked: true, muted: false, forgotten: false } : { tracked: false });
        void saveState();
        setVersion(version => version + 1);
    }

    function setAll(tracked: boolean) {
        for (const friend of groups.trackable) {
            patchFriendState(friend.id, tracked ? { tracked: true, muted: false, forgotten: false } : { tracked: false });
        }

        void saveState();
        setVersion(version => version + 1);
    }

    const query = search.trim().toLowerCase();
    const visible = groups.trackable.filter(friend => friend.name.toLowerCase().includes(query));

    return (
        <Flex flexDirection="column" gap="8px">
            <Flex alignItems="center" gap="8px" flexWrap="wrap">
                <Paragraph>
                    {!hasFriends
                        ? "No friends are available to choose from right now. Add friends and pick them here or in Tether's settings."
                        : selectedCount === 0
                            ? "Please select at least one friend to continue."
                            : `${selectedCount} friends selected.`}
                </Paragraph>
                {hasFriends && (
                    <>
                        <Button size="small" variant="secondary" onClick={() => setAll(true)}>Select all</Button>
                        <Button size="small" variant="secondary" onClick={() => setAll(false)}>Clear</Button>
                    </>
                )}
            </Flex>

            {hasFriends && <TextInput value={search} onChange={setSearch} placeholder="Search friends" />}

            {hasFriends && (
                <div aria-label="Friends to watch" tabIndex={0} style={{ display: "flex", flexDirection: "column", maxHeight: 280, overflowY: "auto" }}>
                    {visible.length === 0
                        ? <Paragraph>No friends match that search.</Paragraph>
                        : visible.map(friend => (
                            <div
                                key={friend.id}
                                style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--background-modifier-accent)" }}
                            >
                                <div
                                    onClick={() => setTracked(friend.id, !isWatched(friend.id))}
                                    style={{ flexGrow: 1, minWidth: 0, cursor: "pointer" }}
                                >
                                    <div>{friend.name}</div>
                                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{describeFriend(friend)}</div>
                                </div>
                                <Switch
                                    aria-label={`Watch ${friend.name}`}
                                    checked={isWatched(friend.id)}
                                    onChange={tracked => setTracked(friend.id, tracked)}
                                />
                            </div>
                        ))}
                </div>
            )}
        </Flex>
    );
}

export function openWhitelistPicker(onClosed?: () => void) {
    openModal(props => (
        <ErrorBoundary>
            <WhitelistPickerModal modalProps={props} onClosed={onClosed} />
        </ErrorBoundary>
    ));
}

function WhitelistPickerModal({ modalProps, onClosed }: { modalProps: RenderModalProps; onClosed?: () => void; }) {
    const calledClosed = useRef(false);
    const [count, setCount] = useState(0);
    const [groups] = useState(getFriendGroups);
    const hasFriends = groups.trackable.length > 0;

    function close() {
        if (!calledClosed.current) {
            calledClosed.current = true;
            onClosed?.();
        }

        modalProps.onClose();
    }

    return (
        <Modal
            {...modalProps}
            onClose={close}
            title="Choose friends to watch"
            size="md"
            actions={[
                {
                    text: hasFriends ? "Done" : "Close",
                    variant: "primary",
                    disabled: hasFriends && count === 0,
                    onClick: close
                }
            ]}
        >
            <Flex flexDirection="column" gap="8px">
                <Paragraph>Tether will only check in about the friends you switch on here. You can change this later in Tether's settings.</Paragraph>
                <FriendChecklist onCountChange={setCount} />
            </Flex>
        </Modal>
    );
}
