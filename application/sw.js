const channel = new BroadcastChannel("sw-messages");

self.onsystemmessage = (evt) => {
  try {
    const serviceHandler = async () => {
      if (evt.name === "activity") {
        handler = evt.data.webActivityRequestHandler();
        const { name: activityName, data: activityData } = handler.source;
        if (activityName == "omap-oauth") {
          channel.postMessage({
            oauth_success: activityData,
          });
        }
      }
    };

    evt.waitUntil(serviceHandler());
  } catch (e) {
    channel.postMessage({ action: "error", content: e });
  }
};
