// Macro to toggle a boolean (true or false) setting in foundryVTT

// List of all settings in console :
// game.settings.settings

// List of a module's settings :
// game.settings.settings.forEach(v => v.namespace === 'replace-with-moduleId' && console.log(v.key));

// Which setting to toggle
const moduleId = "monks-common-display";
const settingKey = "hide-ui";

//Toggle the setting to its opposite, only works on booleans
const currentSetting = game.settings.get(moduleId, settingKey);
const settingType = typeof currentSetting;
let newSetting;
if (settingType === 'boolean') {
  newSetting = !currentSetting;
  game.settings.set(moduleId, settingKey, newSetting);
  console.log(`Updated setting for ${moduleId}.${settingKey}: ${newSetting}`);
}
else {
  ui.notifications.warn(`Setting "${moduleId}.${settingKey}" is not boolean, it is of type "${settingType}".  This macro only works with true/false settings.`);
}
