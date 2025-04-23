// Macro to make tokens "asleep" as in
//  - drop their worn items except those with the confort trait
//  - make the token unconscious
// like in a night ambush scenario

const currentlySelected = canvas.tokens.controlled;
if (currentlySelected.length === 0) {
    ui.notifications.warn("No tokens are currently selected.");
    return;
}
console.group("Characters to become asleep:");
const unconsciousUUID = "Compendium.pf2e.conditionitems.Item.fBnFDH2MTzgFijKf";
for (const token of currentlySelected) {
    const actor = token.actor;
    if (!actor) {
        console.warn(`Token ${token.name} has no associated actor.`);
        continue;
    }
    console.groupCollapsed(`Processing ${actor.name} (Actor ID: ${actor.id})`);
    const itemsToDrop = [];
    for (const item of actor.inventory) {
        const itemName = item.name;
        const itemType = item.type;
        const equippedStatus = item.system?.equipped?.carryType || 'unequipped';
        const handsHeld = item.system?.equipped?.handsHeld || 0;
        if (equippedStatus === 'worn' || handsHeld > 0) {
            if (item.type === 'armor' && item.system?.traits?.value?.includes('comfort')) {
                console.log(`  Keeping worn comfort armor: ${itemName}`);
            } else {
                itemsToDrop.push({
                    actor: actor,
                    item: item
                });
            }
        }
    }
    console.log("  Items to drop:", itemsToDrop); // Log the items to be dropped for this actor
    // Drop items
    for (const dropItem of itemsToDrop) {
        try {
            await dropItem.actor.updateEmbeddedDocuments("Item", [{
                _id: dropItem.item.id,
                "system.equipped.carryType": "dropped"
            }]);
            console.log(`    Dropped item: ${dropItem.item.name} (ID: ${dropItem.item.id})`); // Include item ID
        } catch (error) {
            console.error(`    Error dropping item ${dropItem.item.name}:`, error);
            ui.notifications.error(`Error dropping item ${dropItem.item.name}. Check console for details.`);
        }
    }
    // Apply unconscious effect if not already there
    const hasUnconscious = actor.items.some(item => item.type === 'condition' && item.uuid === unconsciousUUID);
    if (!hasUnconscious) { // Apply only if not already present
        try {
            const effect = await fromUuid(unconsciousUUID);
            if (effect) {
                await actor.createEmbeddedDocuments("Item", [effect.toObject()]);
                console.log(`  Applied unconscious effect to ${actor.name}`);
            } else {
                console.warn(`    Unconscious effect with UUID ${unconsciousUUID} not found.`);
                ui.notifications.warn("Unconscious effect not found.  Make sure the UUID is correct.");
            }
        } catch (error) {
            console.error(`    Error applying unconscious effect to ${actor.name}:`, error);
            ui.notifications.error(`Error applying unconscious effect to ${actor.name}. Check console for details.`);
        }
    } else {
        console.log(`  ${actor.name} already has the unconscious condition.`);
    }
    console.groupEnd();
}
console.groupEnd();
ui.notifications.info("Finished processing sleeping PCs.");
