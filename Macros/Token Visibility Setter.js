// Macro to set pf2e-perception visibility status on tokens towards their targets


let perceptionFlagDialog;
let undoState = null;
let redoState = null;

async function backupCurrentState() {
    const selectedTokens = canvas.tokens.controlled;
    const backup = {};
    const targetedTokens = Array.from(game.user.targets);
    for (const token of selectedTokens) {
        backup[token.id] = {};
        for (const target of targetedTokens) {
            backup[token.id][target.id] = await getPerceptionState(token.id, target.id);
        }
    }
    return backup;
}

async function getPerceptionState(tokenId, targetId) {
    return canvas.tokens.get(tokenId)?.document?.flags["pf2e-perception"]?.data[targetId]?.visibility || "observed";
}

function createChatMessage(title, action, selectedTokens, targetedTokens) {
    let gmMessage = `<div class="pf2e chat-card action-card">
                        <header class="card-header flexrow">
                            <h2>${title}</h2>
                        </header>
                        <div class="card-content">
                            <h3>Action:</h3> ${action}<br>
                            <h3>Selected Tokens:</h3>`;
    selectedTokens.forEach(token => {
        gmMessage += `- ${token.name}<br>`;
    });
    gmMessage += `<h3>Targeted Tokens:</h3>`;
    targetedTokens.forEach(target => {
        gmMessage += `- ${target.name}<br>`;
    });

    ChatMessage.create({
        content: gmMessage,
        whisper: ChatMessage.getWhisperRecipients("GM")
    });
}

async function applyPerceptionChange(updates, actionDescription, actionIcon) {
    const selectedTokens = canvas.tokens.controlled;
    const targetedTokens = Array.from(game.user.targets);
    const numSelected = selectedTokens.length;
    const numTargets = targetedTokens.length;

    const currentStateBeforeAction = await backupCurrentState();
    undoState = currentStateBeforeAction;
    redoState = null;

    for (const targetToken of selectedTokens) {
        for (const perceiverToken of targetedTokens) {
            await targetToken.document.update(updates(perceiverToken.id));
        }
    }
    ui.notifications.info(`Perception visibility changed for ${numSelected} token(s).`);

    createChatMessage("Perception Visibility Change", `<i class="${actionIcon}"></i>  ${actionDescription}`, [...selectedTokens].sort((a, b) => a.name.localeCompare(b.name)), [...targetedTokens].sort((a, b) => a.name.localeCompare(b.name)));
}

async function clearPerceptionFlagVisibility() {
    await applyPerceptionChange(
        (perceiverId) => ({ [`flags.pf2e-perception.data.-=${perceiverId}`]: null }),
        "Set to Observed",
        "fas fa-eye"
    );
}

async function applyPerceptionFlag(visibility) {
    let icon = "";
    switch (visibility) {
        case "concealed":
            icon = "fas fa-cloud";
            break;
        case "hidden":
            icon = "fas fa-user-secret";
            break;
        case "undetected":
            icon = "fas fa-eye-slash";
            break;
        case "unnoticed":
            icon = "fas fa-exclamation-triangle";
            break;
        default:
            icon = "fas fa-eye";
    }
    await applyPerceptionChange(
        (perceiverId) => ({ [`flags.pf2e-perception.data.${perceiverId}.visibility`]: visibility }),
        `Set to ${visibility}`,
        icon
    );
}

async function restoreState(state, action, actionIcon) {
    if (state) {
        const selectedTokens = canvas.tokens.controlled;
        for (const token of selectedTokens) {
            const tokenState = state[token.id];
            if (tokenState) {
                const updates = {};
                for (const targetId in tokenState) {
                    const visibility = tokenState[targetId] === "observed" ? null : { visibility: tokenState[targetId] };
                    updates[`flags.pf2e-perception.data.${targetId}`] = visibility;
                }
                await token.document.update(updates);
            }
        }
        const tokenArray = Object.values(state).map(state => canvas.tokens.get(Object.keys(state)[0]));
        const targetIds = Object.keys(state[Object.keys(state)[0]]);
        const targetTokenArray = targetIds.map(id => canvas.tokens.get(id));
        createChatMessage(action, `<i class="${actionIcon}"></i>  ${action}`, [...tokenArray].sort((a, b) => a.name.localeCompare(b.name)), [...targetTokenArray].sort((a, b) => a.name.localeCompare(b.name)));
        return true;
    }
    return false;
}

async function revertPerceptionChange() {
    if (undoState) {
        const previousState = undoState;
        undoState = null;
        redoState = await backupCurrentState();
        await restoreState(previousState, "Revert", "fas fa-undo-alt");
        ui.notifications.info(`Undid perception change.`);
    } else if (redoState) {
        const futureState = redoState;
        redoState = null;
        undoState = await backupCurrentState();
        await restoreState(futureState, "Redo", "fas fa-undo-alt");
        ui.notifications.info(`Redid perception change.`);
    }
}

async function swapSelectedAndTargeted() {
    const currentlySelected = canvas.tokens.controlled;
    const currentlyTargeted = Array.from(game.user.targets);

    if (currentlySelected.length === 0 && currentlyTargeted.length === 0) {
        return ui.notifications.warn("Please select and/or target at least one token to swap.");
    }

    canvas.tokens.releaseAll();
    await game.user.updateTokenTargets([]);

    if (currentlyTargeted.length > 0) {
        currentlyTargeted.forEach(token => token.control({ releaseOthers: false }));
    }

    if (currentlySelected.length > 0) {
        const selectedIds = currentlySelected.map(token => token.id);
        await game.user.updateTokenTargets(selectedIds);
    }
    ui.notifications.info("Selected and targeted tokens swapped.");
}

async function showTokenVisibilitySetter() {
    undoState = null;
    redoState = null;

    const selectedTokens = canvas.tokens.controlled;
    const targetedTokens = Array.from(game.user.targets);

    if (selectedTokens.length === 0) {
        return ui.notifications.warn("Please select at least one token.");
    }
    if (game.user.targets.length === 0) {
        return ui.notifications.warn("Please target at least one token.");
    }

    const buttons = [
        {
            action: "observed",
            label: "<i class='fas fa-eye'></i> Observed by target(s)",
            callback: () => clearPerceptionFlagVisibility()
        },
        {
            action: "concealed",
            label: "<i class='fas fa-cloud'></i> Concealed from target(s)",
            callback: () => applyPerceptionFlag("concealed")
        },
        {
            action: "hidden",
            label: "<i class='fas fa-user-secret'></i> Hidden from target(s)",
            callback: () => applyPerceptionFlag("hidden")
        },
        {
            action: "undetected",
            label: "<i class='fas fa-eye-slash'></i> Undetected by target(s)",
            callback: () => applyPerceptionFlag("undetected")
        },
        {
            action: "unnoticed",
            label: "<i class='fas fa-exclamation-triangle'></i> Unnoticed by target(s)",
            callback: () => applyPerceptionFlag("unnoticed")
        },
        {
            action: "swapTargets",
            label: "<i class='fas fa-exchange-alt'></i> Swap Selected/Targeted",
            callback: () => swapSelectedAndTargeted()
        },
        {
            action: "revert",
            label: "<i class='fas fa-undo-alt'></i> Revert/Redo",
            callback: () => revertPerceptionChange()
        }
    ];

    await foundry.applications.api.DialogV2.wait({
        window: { title: "Apply Perception Visibility" },
        form: { closeOnSubmit: false },
        content: `<p>Click a button to set the selected tokens' visibility relative to the targeted tokens:</p>`,
        buttons: buttons,
        rejectClose: false,
        position: { width: 380 },
        render: (_, html) => { html.querySelector(".form-footer").style.flexWrap = "wrap"; },
        close: () => {
            undoState = null;
            redoState = null;
        }
    });
}
showTokenVisibilitySetter();
