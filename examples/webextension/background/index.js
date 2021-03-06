/**
When the button's clicked:
- call for OneKeyConnect action
- show a notification with response (if succeed)
*/

OneKeyConnect.manifest({
    email: 'email@developer.com',
    appUrl: 'webextension-app-boilerplate',
});

function onClick() {
    OneKeyConnect.getAddress({
        path: "m/49'/0'/0'/0/0",
    }).then(response => {
        const message = response.success ? `BTC Address: ${ response.payload.address }` : `Error: ${ response.payload.error }`;
        chrome.notifications.create(new Date().getTime().toString(), {
            type: 'basic',
            iconUrl: 'icons/48.png',
            title: 'TrezorConnect',
            message,
        });
    }).catch(error => {
        console.error('TrezorConnectError', error);
    });
}
chrome.browserAction.onClicked.addListener(onClick);
