import { Component, createSignal, onMount } from 'solid-js';

const InstallButton: Component = () => {
  const [showInstallButton, setShowInstallButton] = createSignal(false);
  let deferredPrompt: any;

  onMount(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setShowInstallButton(true);
    });

    window.addEventListener('appinstalled', () => {
      setShowInstallButton(false);
      deferredPrompt = null;
    });
  });

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User ${outcome} the install prompt`);
      deferredPrompt = null;
      setShowInstallButton(false);
    }
  };

  return (
    <>
      {showInstallButton() && (
        <button class="install-button" onClick={handleInstall}>
          📱 Install App
        </button>
      )}
    </>
  );
};

export default InstallButton;
