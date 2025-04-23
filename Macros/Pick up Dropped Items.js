// Macro to pick up all dropped items
// Equips backpacks if only one is found

const tokens = canvas.tokens.controlled;
if (!tokens.length) {
    ui.notifications.warn("No tokens selected.");
    return;
}
console.group("Characters to pick up dropped items:");
for (const token of tokens) {
    const actor = token.actor;
    if (!actor) continue;
    console.groupCollapsed(`Processing ${actor.name} (Actor ID: ${actor.id})`);
    const droppedItems = actor.inventory.filter(item => item.system?.equipped?.carryType === 'dropped');
    if (droppedItems.length === 0) {
        console.log(`  ${actor.name} has no dropped items.`);
        console.groupEnd();
        continue;
    }
    // Find containers and if there's only one with 'inSlot' 
        // inSlot = binary value for it to be 'Worn (as backpack)'
    const containers = droppedItems.filter(item => item.type === 'backpack' && item.system?.equipped?.inSlot !== undefined);
    const setInSlot = containers.length === 1;
    if (containers.length > 1) {
        ui.notifications.warn(`More than one backpack found on ${actor.name}. Manually equip the correct Backpack.`);
    }
    for (const item of droppedItems) {
        console.log(`    Picking up item: ${item.name} (ID: ${item.id})`);
        try {
            let updateData = {
                _id: item.id,
                "system.equipped.carryType": "worn",
            };
            // Check if it's a container and should set inSlot
            if (item.type === 'backpack' && item.system?.equipped?.inSlot !== undefined) {
                updateData["system.equipped.inSlot"] = setInSlot;
            }
            await actor.updateEmbeddedDocuments("Item", [updateData]);
        } catch (error) {
            console.error(`  Error picking up item ${item.name}:`, error);
        }
    }
    console.groupEnd();
}
console.groupEnd();
ui.notifications.info("Finished processing dropped items.");
