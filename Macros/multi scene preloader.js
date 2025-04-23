// MAcro to preload multiple scenes at once
// prints out a list of the current world scenes
// Select and confirm to send it to preload to all clients

async function listAndPreloadScenes() {
  const scenesData = Array.from(game.scenes.values()).map(scene => {
    const folder = scene.folder?._id ? game.folders.get(scene.folder._id) : null;
    const folderName = folder ? `(${folder.name}) ` : '';
    return {
      name: scene.name,
      id: scene.id,
      fullLabel: `${folderName}${scene.name}`
    };
  });

  const columnCount = Math.ceil(scenesData.length / 30);

  const checkboxes = scenesData.map(scene => `
    <label><input type="checkbox" name="sceneIds" value="${scene.id}"> ${scene.fullLabel}</label>
  `).join('');

  const dialogContent = `
    <style>
      .scene-list-container {
        display: grid;
        grid-template-columns: repeat(${columnCount}, min-content);
      }
      .scene-list-container label {
        display: block;
        min-width: 400px;
      }
    </style>
    <form class="scene-list-container">
      ${checkboxes}
    </form>
  `;

  async function handlePreload(html) {
    const checkedIds = html.find('input[name="sceneIds"]:checked').map(function() {
      return this.value;
    }).get();

    console.log("Selected Scene IDs for Preloading:", checkedIds);

    if (checkedIds.length > 0) {
      ui.notifications.info(`Preloading ${checkedIds.length} scene(s)...`);
      for (const sceneId of checkedIds) {
        try {
          await game.scenes.preload(sceneId, true);
          console.log(`Preloading complete for scene ID: ${sceneId}`);
        } catch (error) {
          ui.notifications.error(`An error occurred while preloading scene: ${error}`);
        }
      }
      ui.notifications.info(`Preloading process completed for selected scenes.`);
    } else {
      ui.notifications.warn("No scenes selected for preloading.");
    }
  }

  await new Promise(resolve => {
    new Dialog({
      title: "Select Scenes to Preload",
      content: dialogContent,
      buttons: {
        preload: {
          label: "Preload Selected",
          callback: async (html) => {
            await handlePreload(html);
            resolve();
          }
        },
        cancel: {
          label: "Cancel",
          callback: () => {
            resolve();
          }
        }
      },
      default: "preload",
    }).render(true, { width: '1500' });
  });
}

listAndPreloadScenes();
