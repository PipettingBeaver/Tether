/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 tan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Paragraph } from "@components/Paragraph";
import { Switch } from "@components/Switch";
import { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, UserStore, useState } from "@webpack/common";

import { ListMode } from "./engine";
import { getFriends } from "./friends";
import settings from "./settings";
import { hasOnboarded, markOnboarded } from "./state";

function SwitchRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: () => void; }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
                <div>{title}</div>
                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{description}</div>
            </div>
            <Switch checked={checked} onChange={onChange} />
        </div>
    );
}

function openOnboarding() {
    openModal(props => (
        <ErrorBoundary>
            <OnboardingModal modalProps={props} />
        </ErrorBoundary>
    ));
}

export async function maybeShowOnboarding() {
    if (!UserStore.getCurrentUser()) return;
    if (await hasOnboarded()) return;

    await markOnboarded();
    openOnboarding();
}

export function OnboardingModal({ modalProps }: { modalProps: RenderModalProps; }) {
    const { listMode } = settings.use(["listMode"]);
    const [friendCount] = useState(() => getFriends().length);

    function choose(mode: ListMode) {
        settings.store.listMode = mode;
    }

    return (
        <Modal
            {...modalProps}
            title="Welcome to Tether"
            size="md"
            actions={[
                {
                    text: "Start Tether",
                    variant: "primary",
                    onClick: () => modalProps.onClose()
                }
            ]}
        >
            <Flex flexDirection="column" gap="12px">
                <Paragraph>Tether works in the background, or you can check in any time by clicking the knot icon {"\u{1FAA2}"} in a chat window.</Paragraph>
                <Paragraph>Choose the mode Tether checks in on (choose one):</Paragraph>

                <SwitchRow
                    title="Only friends I choose (whitelist)"
                    description="You pick who counts in the friend list"
                    checked={listMode === "whitelist"}
                    onChange={() => choose("whitelist")}
                />
                <SwitchRow
                    title={`Friends messaged recently (within last ${settings.store.recentDays} days)`}
                    description="Automatically includes recent conversations"
                    checked={listMode === "recent"}
                    onChange={() => choose("recent")}
                />
                <SwitchRow
                    title={`Friends messaged recently or not (within last ${Math.round(settings.store.oldFriendsDays / 365)} years)`}
                    description="Also includes friends you have not messaged in a while"
                    checked={listMode === "old"}
                    onChange={() => choose("old")}
                />

                {friendCount > 0 && (
                    <Paragraph>You have {friendCount} {friendCount === 1 ? "friend" : "friends"} on Discord.</Paragraph>
                )}
                <Paragraph>Tether does a gradual one-time check of friend lists greater than 128, so notifications might take a day to fully tether to all friends.</Paragraph>

                <Paragraph>
                    <b>Unofficial build:</b> this is a Vencord build made for Tether. It is not affiliated with or supported by the Vencord team.
                </Paragraph>

                {IS_WEB && (
                    <Paragraph>
                        <b>Reload the tab after choosing an option for the manual Tether button to appear.</b>
                    </Paragraph>
                )}

                <Paragraph>If you are looking to customize further, you can access Tether's options menu later.</Paragraph>
            </Flex>
        </Modal>
    );
}
