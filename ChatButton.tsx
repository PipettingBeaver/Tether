/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 tan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { IconComponent } from "@utils/types";

import { openTether } from "./modal";
import settings from "./settings";

export const TetherIcon: IconComponent = ({ className }) => (
    <span className={className} role="img" aria-label="Tether" style={{ fontSize: 18, lineHeight: 1 }}>
        {"\u{1FAA2}"}
    </span>
);

export const TetherButton: ChatBarButtonFactory = () => settings.store.chatButton
    ? (
        <ChatBarButton tooltip="Tether: check in on your friends" onClick={() => void openTether()}>
            <TetherIcon />
        </ChatBarButton>
    )
    : null;
