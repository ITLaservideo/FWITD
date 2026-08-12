/**
 * @version 1.0
 * Guided installation wizard for DataCipher.SecureMessaging (see LIBS/DataCipher/SecureMessageReadme.md):
 * walks through prerequisites, then lets this machine create its own key pair and pin the other
 * side's public key, backed by `InstallationSecureMessaging/{Status,SaveConfig,CreateOwnKey,ImportPeerKey}`.
 */
class InstallationSecureMessaging extends FrameworkGC(`${injector_html}`) {
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        this.#initialize();
    }

    elements = {
        /** @type {HTMLElement} */
        wizardMount: null,
    }

    /** last known backend Status() snapshot, refreshed after every mutating call */
    #status = null;

    async #initialize() {
        this.#status = await Lobby.postAsync('InstallationSecureMessaging/Status');
        this.#buildWizard();
    }

    #buildWizard() {
        const owner = this;
        const step1 = { title: Locale.at('Prerequisites') };
        const step2 = { title: Locale.at('Role & slots'), freeUndo: true };
        const step3 = { title: Locale.at('Your key'), freeUndo: true };
        const step4 = { title: Locale.at('Peer key'), freeUndo: true };
        const step5 = { title: Locale.at('Done'), freeUndo: true };

        step1.content = owner.#buildPrerequisitesStep(step1);
        step2.content = owner.#buildRoleStep(step2);
        step3.content = owner.#buildOwnKeyStep(step3);
        step4.content = owner.#buildPeerKeyStep(step4);
        step5.content = owner.#buildDoneStep(step5);

        const wizard = new WizardStepper({
            steps: [step1, step2, step3, step4, step5],
            onFinish: () => UiBuilder.Notify('✔ ' + Locale.at('Secure messaging is set up')),
        });
        owner.elements.wizardMount.replaceChildren(wizard.elementReference());
    }

    /** Back + custom "next" button row, wired to the WizardStepper-assigned step.onUndo/onComplete. */
    #navRow(step, nextButton, { showBack = true } = {}) {
        const row = document.createElement('div');
        row.className = 'ism-nav-row';
        if (showBack) {
            row.appendChild(UiBuilder.createButton({ title: Locale.at('Back'), theme: 'text', onClick: () => step.onUndo?.() }));
        } else {
            row.appendChild(document.createElement('span'));
        }
        row.appendChild(nextButton);
        return row;
    }

    #buildPrerequisitesStep(step) {
        const el = document.createElement('div');
        el.className = 'ism-step';

        const intro = document.createElement('p');
        intro.className = 'ism-intro';
        intro.textContent = Locale.at('Before pairing this machine with the other side, make sure of the following:');
        el.appendChild(intro);

        const list = document.createElement('ul');
        list.className = 'ism-checklist';
        [
            'DataCipher is already built into this app - there is nothing else to install.',
            'Key material is stored securely per-user on this device and must survive reinstalls - do not exclude it from backups or wipe user profile data.',
            'Agree with the other side\'s administrator, out of band (never over this same channel), on two distinct identity numbers for this pairing - you\'ll enter them on the next step.',
        ].forEach(text => {
            const li = document.createElement('li');
            li.textContent = Locale.at(text);
            list.appendChild(li);
        });
        el.appendChild(list);

        const nextBtn = UiBuilder.createButton({ title: Locale.at('Next'), onClick: () => step.onComplete() });
        el.appendChild(this.#navRow(step, nextBtn, { showBack: false }));
        return el;
    }

    #buildRoleStep(step) {
        const owner = this;
        const el = document.createElement('div');
        el.className = 'ism-step';

        const intro = document.createElement('p');
        intro.className = 'ism-intro';
        intro.textContent = Locale.at('Pick this machine\'s role, then enter the two identity numbers you agreed on with the other side. Both must be less than -100.');
        el.appendChild(intro);

        let role = owner.#status?.role === 'server' ? 'server' : 'client';

        const rolePicker = document.createElement('div');
        rolePicker.className = 'ism-role-picker';
        const serverChip = UiBuilder.createButton({ title: Locale.at('Server'), theme: 'text', class: 'ism-role-chip', onClick: () => setRole('server') });
        const clientChip = UiBuilder.createButton({ title: Locale.at('Client machine'), theme: 'text', class: 'ism-role-chip', onClick: () => setRole('client') });
        rolePicker.append(serverChip, clientChip);
        el.appendChild(rolePicker);

        const ownSlotInput = document.createElement('input');
        ownSlotInput.type = 'number';
        ownSlotInput.className = 'ism-input';
        ownSlotInput.value = owner.#status?.ownSlot ?? '';

        const peerSlotInput = document.createElement('input');
        peerSlotInput.type = 'number';
        peerSlotInput.className = 'ism-input';
        peerSlotInput.value = owner.#status?.peerSlot ?? '';

        const ownRow = UiBuilder.createSettingsRow({ label: Locale.at('This machine\'s slot'), description: '-', control: ownSlotInput });
        const peerRow = UiBuilder.createSettingsRow({ label: Locale.at('Other side\'s slot'), description: '-', control: peerSlotInput });
        el.appendChild(UiBuilder.createSettingsGroup({ rows: [ownRow, peerRow] }));

        const ownDescription = ownRow.querySelector('.settings-row-description');
        const peerDescription = peerRow.querySelector('.settings-row-description');

        function setRole(newRole) {
            role = newRole;
            serverChip.classList.toggle('active', role === 'server');
            clientChip.classList.toggle('active', role === 'client');
            if (role === 'server') {
                ownDescription.textContent = Locale.at('Fixed slot for this server, e.g. -101 - every client is told this number.');
                peerDescription.textContent = Locale.at('A distinct slot for the one client you\'re pairing right now, e.g. -102 - repeat this wizard with a different number per client.');
                if (!ownSlotInput.value) ownSlotInput.value = '-101';
            } else {
                ownDescription.textContent = Locale.at('The unique slot number the server\'s administrator assigned to this machine, e.g. -102.');
                peerDescription.textContent = Locale.at('The server\'s fixed slot, e.g. -101, as given to you by its administrator.');
                if (!peerSlotInput.value) peerSlotInput.value = '-101';
            }
        }
        setRole(role);

        const statusLine = document.createElement('div');
        statusLine.className = 'ism-status-line';
        el.appendChild(statusLine);

        const saveBtn = UiBuilder.createAsyncButton({
            title: Locale.at('Save & continue'),
            onClick: async () => {
                const ownSlot = Number(ownSlotInput.value);
                const peerSlot = Number(peerSlotInput.value);
                const valid = Number.isInteger(ownSlot) && ownSlot < -100 && Number.isInteger(peerSlot) && peerSlot < -100 && ownSlot !== peerSlot;
                if (!valid) {
                    statusLine.textContent = Locale.at('Enter two different whole numbers, each less than -100.');
                    statusLine.classList.add('err');
                    return;
                }
                owner.#status = await Lobby.postAsync('InstallationSecureMessaging/SaveConfig', { role, ownSlot, peerSlot });
                statusLine.textContent = '';
                statusLine.classList.remove('err');
                step.onComplete();
            },
        });
        el.appendChild(this.#navRow(step, saveBtn));
        return el;
    }

    #buildOwnKeyStep(step) {
        const owner = this;
        const el = document.createElement('div');
        el.className = 'ism-step';

        const intro = document.createElement('p');
        intro.className = 'ism-intro';
        intro.textContent = Locale.at('Create this machine\'s key pair (once), then send the public key below to the other side out of band - a secrets manager, a deploy-time config value, or an admin pasting it in.');
        el.appendChild(intro);

        const keyBox = document.createElement('textarea');
        keyBox.className = 'ism-pem-box';
        keyBox.readOnly = true;
        keyBox.placeholder = Locale.at('No key created yet.');
        el.appendChild(keyBox);

        const statusLine = document.createElement('div');
        statusLine.className = 'ism-status-line';

        const actionsRow = document.createElement('div');
        actionsRow.className = 'ism-actions-row';

        const createBtn = UiBuilder.createAsyncButton({
            title: Locale.at('Create my key'),
            onClick: async () => {
                const rsp = await Lobby.postAsync('InstallationSecureMessaging/CreateOwnKey');
                owner.#status = { ...owner.#status, ownKeyExists: true, ownPublicKeyPem: rsp.publicKeyPem, ownKeyAgeDays: 0, ownKeyShouldRotate: false };
                refresh();
            },
        });
        const copyBtn = UiBuilder.createButton({
            title: Locale.at('Copy'),
            theme: 'text',
            onClick: async (event) => {
                try {
                    await navigator.clipboard.writeText(keyBox.value);
                    UiBuilder.Notify('✔ ' + Locale.at('Copied'), event);
                } catch {
                    keyBox.select();
                }
            },
        });
        actionsRow.append(createBtn, copyBtn);
        el.appendChild(actionsRow);
        el.appendChild(statusLine);

        function refresh() {
            const exists = !!owner.#status?.ownKeyExists;
            keyBox.value = owner.#status?.ownPublicKeyPem ?? '';
            createBtn.style.display = exists ? 'none' : '';
            copyBtn.style.display = exists ? '' : 'none';
            if (exists) {
                const days = owner.#status?.ownKeyAgeDays;
                let msg = Locale.at('Key already set up');
                if (typeof days === 'number') msg += ` (${Math.floor(days)} ${Locale.at('days old')})`;
                if (owner.#status?.ownKeyShouldRotate) msg += ' - ' + Locale.at('rotation recommended');
                statusLine.textContent = msg;
                statusLine.classList.toggle('warn', !!owner.#status?.ownKeyShouldRotate);
                statusLine.classList.remove('err');
            } else {
                statusLine.textContent = '';
                statusLine.classList.remove('warn', 'err');
            }
        }
        refresh();

        const nextBtn = UiBuilder.createButton({
            title: Locale.at('Next'),
            onClick: () => {
                if (!owner.#status?.ownKeyExists) {
                    statusLine.textContent = Locale.at('Create your key first.');
                    statusLine.classList.add('err');
                    return;
                }
                step.onComplete();
            },
        });
        el.appendChild(this.#navRow(step, nextBtn));
        return el;
    }

    #buildPeerKeyStep(step) {
        const owner = this;
        const el = document.createElement('div');
        el.className = 'ism-step';

        const intro = document.createElement('p');
        intro.className = 'ism-intro';
        intro.textContent = Locale.at('Paste the public key PEM you received from the other side out of band, then import it.');
        el.appendChild(intro);

        const pemInput = document.createElement('textarea');
        pemInput.className = 'ism-pem-box';
        pemInput.placeholder = '-----BEGIN PUBLIC KEY-----';
        el.appendChild(pemInput);

        const statusLine = document.createElement('div');
        statusLine.className = 'ism-status-line';

        const importBtn = UiBuilder.createAsyncButton({
            title: Locale.at('Import'),
            onClick: async () => {
                const pem = pemInput.value.trim();
                if (!pem) {
                    statusLine.textContent = Locale.at('Paste the peer\'s public key first.');
                    statusLine.classList.add('err');
                    return;
                }
                const rsp = await Lobby.postAsync('InstallationSecureMessaging/ImportPeerKey', { pem });
                if (!rsp.ok) {
                    statusLine.textContent = Locale.at('Import failed - a private key already exists at that slot, or the PEM is invalid.');
                    statusLine.classList.add('err');
                    return;
                }
                owner.#status = { ...owner.#status, peerKeyImported: true };
                statusLine.textContent = Locale.at('Peer public key imported.');
                statusLine.classList.remove('err');
            },
        });
        const actionsRow = document.createElement('div');
        actionsRow.className = 'ism-actions-row';
        actionsRow.appendChild(importBtn);
        el.appendChild(actionsRow);
        el.appendChild(statusLine);

        if (owner.#status?.peerKeyImported) {
            statusLine.textContent = Locale.at('Peer public key already imported.');
        }

        const nextBtn = UiBuilder.createButton({
            title: Locale.at('Next'),
            onClick: () => {
                if (!owner.#status?.peerKeyImported) {
                    statusLine.textContent = Locale.at('Import the peer\'s public key first.');
                    statusLine.classList.add('err');
                    return;
                }
                step.onComplete();
            },
        });
        el.appendChild(this.#navRow(step, nextBtn));
        return el;
    }

    #buildDoneStep(step) {
        const owner = this;
        const el = document.createElement('div');
        el.className = 'ism-step';

        const summary = document.createElement('div');
        el.appendChild(summary);

        const badge = (text, color) => UiBuilder.createBadge(text, { color });
        const textSpan = (value) => {
            const s = document.createElement('span');
            s.textContent = value ?? '-';
            return s;
        };

        const s = owner.#status ?? {};
        const rows = [
            UiBuilder.createSettingsRow({ label: Locale.at('Role'), control: badge(s.role === 'server' ? Locale.at('Server') : Locale.at('Client machine'), 'info') }),
            UiBuilder.createSettingsRow({ label: Locale.at('This machine\'s slot'), control: textSpan(s.ownSlot) }),
            UiBuilder.createSettingsRow({ label: Locale.at('Other side\'s slot'), control: textSpan(s.peerSlot) }),
            UiBuilder.createSettingsRow({ label: Locale.at('Own key'), control: badge(s.ownKeyExists ? Locale.at('Ready') : Locale.at('Missing'), s.ownKeyExists ? 'success' : 'danger') }),
            UiBuilder.createSettingsRow({ label: Locale.at('Peer key'), control: badge(s.peerKeyImported ? Locale.at('Imported') : Locale.at('Missing'), s.peerKeyImported ? 'success' : 'danger') }),
        ];
        summary.appendChild(UiBuilder.createSettingsGroup({ rows }));

        const finishBtn = UiBuilder.createButton({ title: Locale.at('Done'), onClick: () => step.onComplete() });
        el.appendChild(this.#navRow(step, finishBtn));
        return el;
    }
}
