/** This Macro is an adjustable template for using pf2e-toolbelt's Actionable functions to perform the following actions when the action is "used" :
- Send the action to chat as a message
- Remove effects as selected by UUID
- Add effects as selected by UUID
- Execute game commands
- Execute custom functions

** This macro needs to be activated using the "Use" button (via Pf2e-toolbelt Actionable) and not to be used as a standalone macro **
Add the correct values in the following sections in a format matching the commented examples.
*/

const ITEM_UUIDS_TO_REMOVE = [
  // "Compendium.pf2e.feat-effects.Item.uBJsxCzNhje8m8jj", // Effect: Panache
  // "Compendium.pf2e.conditionitems.Item.j91X7x0XSomq8d60" // Condition: Prone
];
const ITEM_UUIDS_TO_ADD = [
  // "Compendium.pf2e.conditionitems.Item.j91X7x0XSomq8d60", // Effect: Prone
];
const gameCommandsToExecute = [
  // () => game.pf2eRangedCombat?.reload(), // pf2e-ranged-combat Reload
];
const customFunctionsToExecute = [
  // functionName,
];
// --- Start of Custom Functions ---
  /* async function functionName(){
  // console.log("FunctionName Activated");
  // }
  // async function functionName2(){
  // }
  */
// --- End of Custom Functions ---

// --- Core Functions ---
async function removeEffectsByUUIDs(actor, uuids) {
  for (const uuid of uuids) {
    const existing = actor.items.find(
      (effect) => effect._stats.compendiumSource === uuid
    );
    if (existing) {
      await existing.delete();
    } else {
      const errorMessage = game.i18n.format("PF2E.ErrorMessage.ItemNotFoundByUUID", { uuid: uuid });
      ui.notifications.error(errorMessage);
      console.warn(errorMessage);
    }
  }
}
async function addEffectsByUUIDs(actor, uuids) {
  for (const uuid of uuids) {
    try {
      const itemToAdd = await fromUuid(uuid);
      if (itemToAdd) {
        const source = itemToAdd.toObject();
        source._stats.compendiumSource = uuid;
        await actor.createEmbeddedDocuments("Item", [source]);
      } else {
        const errorMessage = `Item with UUID "${uuid}" not found.`;
        ui.notifications.error(errorMessage);
        console.warn(errorMessage);
      }
    } catch (error) {
      console.error(`Error adding item with UUID "${uuid}":`, error);
      ui.notifications.error(`Error adding item: ${error.message}`);
    }
  }
}
async function executeGameCommands() {
  for (const command of gameCommandsToExecute) {
    if (typeof command === 'function') {
      await command();
    } else {
      console.warn("Invalid command in gameCommandsToExecute:", command);
    }
  }
}
async function executeCustomFunctions() {
  for (const customFunction of customFunctionsToExecute) {
    if (typeof customFunction === 'function') {
      await customFunction();
    } else {
      console.warn("Invalid function in customFunctionsToExecute:", customFunction);
    }
  }
}

// --- Main Execution ---
(async () => {
  // Make sure the macro is called by the Use button on an Action
  if (!actor || !token) {
    ui.notifications.warn("Missing Actor/Token Information! Make sure you are using this on a character.");
    return;
  }
  if (canvas.tokens.controlled.length !== 1) {
    ui.notifications.warn("Multiple Actors/Token Selected! Make sure you only have one Actor/Token selected.");
    return;
  }
  if (!scope?.item) {
    ui.notifications.warn("Missing Item Information! Macro must be attached to a action/feat that can be used.");
    return;
  }

  try {
    await item.toMessage();
    await removeEffectsByUUIDs(actor, ITEM_UUIDS_TO_REMOVE);
    await addEffectsByUUIDs(actor, ITEM_UUIDS_TO_ADD);
    await executeGameCommands();
    await executeCustomFunctions();
    return;
  } catch (topLevelError) {
    ui.notifications.error(`An error occurred: ${topLevelError.message}`);
    return;
  }
})();
