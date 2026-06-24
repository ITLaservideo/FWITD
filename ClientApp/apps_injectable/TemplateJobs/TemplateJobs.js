/**
 * Mock Job Simulator — demonstrates TaskSchedulerController lifecycle.
 * automatically instantiated with setTimeout(`window.the_main_app = new App()`)
 *
 * Jobs are executed here in JS. The backend (TaskSchedulerController) manages
 * state and persistence; this frontend drives each job to completion.
 * JobExecutor is defined in lib/Jobs.js, loaded before this file.
 */
class App {
    elements = {
        floating_container: null,
        job_list: null,
        action_select: null,
    }
    #pollTimer = null
    #jobs = []
    #executor = new JobExecutor()
        .register('QuickTask', async ctx => {
            // 10 steps × 10 % — resume from saved progress
            const start = Math.ceil(ctx.progress / 10);
            for (let i = start + 1; i <= 10; i++) {
                await ctx.checkPause();
                await ctx.sleep(300);
                await ctx.updateProgress(i * 10);
            }
        })
        .register('WhenReady', async ctx => {
            // 20 steps × 5 % — resume from saved progress
            const start = Math.ceil(ctx.progress / 5);
            for (let i = start + 1; i <= 20; i++) {
                await ctx.checkPause();
                await ctx.sleep(500);
                await ctx.updateProgress(i * 5);
            }
        })
        .register('AutomaticTask', async ctx => {
            // 30 steps — resume from saved progress
            const start = Math.round(ctx.progress / 100 * 30);
            for (let i = start + 1; i <= 30; i++) {
                await ctx.checkPause();
                await ctx.sleep(1000);
                await ctx.updateProgress(Math.round(i / 30 * 100));
            }
        })

    constructor() {
        AppStatus.displayVersion();
        this.#init();
        const late_ops = setInterval(() => {
            if (document.readyState == 'complete') {
                App.#onPageFullyLoaded();
                clearInterval(late_ops);
            }
        }, 750);
    }

    async #init() {
        const owner = this;

        owner.elements.floating_container = UiBuilder.createFloatingContainer(null, {
            id: "job-simulator",
            direction: "vertical",
            style: "min-width:300px;max-height:540px;",
            onDestroy: () => { if (owner.#pollTimer) clearInterval(owner.#pollTimer); }
        });

        // ── Action selector + Add button ──────────────────────────────────────
        const hdr = document.createElement('div');
        hdr.className = 'tj-hdr';
        hdr.appendChild(await SystemSettings.getController("AutoRestartInterruptedTasks"));
        const sel = document.createElement('select');
        sel.className = 'tj-action-select';
        ['QuickTask', 'WhenReady', 'AutomaticTask'].forEach(a => {
            const o = document.createElement('option');
            o.value = o.textContent = a;
            sel.appendChild(o);
        });
        owner.elements.action_select = sel;

        const btnAdd = UiBuilder.createButton({
            title: '+ Add',
            style: 'font-size:12px;white-space:nowrap;',
            onClick: async () => {
                await owner.#addJob();
                btnAdd.classList.remove('clicked');
            }
        });

        const btnSettings = UiBuilder.createButton({
            icon_code: 'e8b8',
            style: 'font-size:12px;flex-shrink:0;',
            hint: 'System Settings',
            onClick: () => {
                const ss = new SystemSettings({});
                new BottomSheet({ element: ss.elementReference() });
                btnSettings.classList.remove('clicked');
            }
        });

        hdr.appendChild(sel);
        hdr.appendChild(btnAdd);
        hdr.appendChild(btnSettings);
        owner.elements.floating_container.appendChild(hdr);

        // ── Divider ───────────────────────────────────────────────────────────
        const divider = document.createElement('div');
        divider.className = 'tj-divider';
        owner.elements.floating_container.appendChild(divider);

        // ── Job list ──────────────────────────────────────────────────────────
        const list = document.createElement('div');
        list.className = 'tj-job-list';
        owner.elements.job_list = list;
        owner.elements.floating_container.appendChild(list);

        document.body.appendChild(owner.elements.floating_container);

        owner.#pollTimer = setInterval(() => owner.#refresh(), 30000);
        await owner.#refresh();
    }

    async #addJob() {
        const owner = this;
        const NAMES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda'];
        const action = owner.elements.action_select.value;
        const name = NAMES[Math.floor(Math.random() * NAMES.length)] + '-' + action;
        try {
            const { id } = await Lobby.postAsync('TaskScheduler/CreateJob', { name, action });
            await Lobby.postAsync('TaskScheduler/StartJob', { id });
            await owner.#refresh();
        } catch (err) {
            UiBuilder.Notify('⚠ ' + (err?.message ?? String(err)));
        }
    }

    async #refresh() {
        try {
            const res = await Lobby.postAsync('TaskScheduler/ListJobs');
            this.#jobs = res.jobs ?? [];
            this.#executor.tick(this.#jobs);
            this.#renderJobs();
        } catch (_) { /* server not ready yet */ }
    }

    #renderJobs() {
        const owner = this;
        const list = owner.elements.job_list;

        // Remove cards for jobs that no longer exist
        const liveIds = new Set(owner.#jobs.map(j => j.id));
        list.querySelectorAll('[data-job-id]').forEach(el => {
            if (!liveIds.has(el.dataset.jobId)) el.remove();
        });

        // Empty-state placeholder
        if (owner.#jobs.length === 0) {
            if (!list.querySelector('.no-jobs')) {
                list.innerHTML = '';
                const empty = document.createElement('div');
                empty.className = 'no-jobs tj-no-jobs';
                empty.textContent = 'No jobs yet — add one above.';
                list.appendChild(empty);
            }
            return;
        }
        list.querySelector('.no-jobs')?.remove();

        // Upsert a card per job
        owner.#jobs.forEach(job => {
            let card = list.querySelector(`[data-job-id="${job.id}"]`);
            if (!card) {
                card = App.#buildCard(job.id);
                list.appendChild(card);
            }
            owner.#syncCard(card, job);
        });
    }

    static #buildCard(id) {
        const card = document.createElement('div');
        card.dataset.jobId = id;
        card.className = 'tj-card';

        // Row 1 — name + status badge
        const r1 = document.createElement('div');
        r1.className = 'tj-card-r1';
        const name = document.createElement('span');
        name.className = 'jc-name';
        const badge = document.createElement('span');
        badge.className = 'jc-badge';
        r1.append(name, badge);

        // Row 2 — progress track
        const track = document.createElement('div');
        track.className = 'tj-card-track';
        const bar = document.createElement('div');
        bar.className = 'jc-bar';
        track.appendChild(bar);

        // Row 3 — meta label + action buttons
        const r3 = document.createElement('div');
        r3.className = 'tj-card-r3';
        const meta = document.createElement('span');
        meta.className = 'jc-meta';
        const btns = document.createElement('div');
        btns.className = 'jc-btns';
        r3.append(meta, btns);

        card.append(r1, track, r3);
        return card;
    }

    #syncCard(card, job) {
        const owner = this;

        // Name
        card.querySelector('.jc-name').textContent = job.name;

        // Badge
        const badge = card.querySelector('.jc-badge');
        badge.textContent = job.status.toUpperCase();
        const bc = App.#BADGE[job.status] ?? App.#BADGE.default;
        badge.style.background = bc.bg;
        badge.style.color = bc.fg;

        // Progress bar
        const bar = card.querySelector('.jc-bar');
        const pct = (job.status === 'Completed') ? 100 : (job.progress ?? 0);
        bar.style.width = pct + '%';
        bar.style.background = App.#BAR[job.status] ?? App.#BAR.default;

        // Meta: id + elapsed seconds
        const meta = card.querySelector('.jc-meta');
        if (job.startedAt) {
            const elapsed = Math.round((Date.now() - new Date(job.startedAt).getTime()) / 1000);
            meta.textContent = `#${job.id}  ${elapsed}s  ${pct}%`;
        } else {
            meta.textContent = `#${job.id}`;
        }

        // Rebuild action buttons
        const btns = card.querySelector('.jc-btns');
        btns.innerHTML = '';

        if (job.status === 'Running') {
            btns.appendChild(UiBuilder.createButton({
                icon_code: 'e034',
                hint: 'Pause',
                onClick: async () => {
                    await Lobby.postAsync('TaskScheduler/PauseJob', { id: job.id });
                    await owner.#refresh();
                }, class: "tj-action-btn"
            }));
        }
        if (job.status === 'Paused') {
            btns.appendChild(UiBuilder.createButton({
                icon_code: 'f6b5',
                hint: 'Resume',
                onClick: async () => {
                    await Lobby.postAsync('TaskScheduler/ResumeJob', { id: job.id });
                    await owner.#refresh();
                }, class: "tj-action-btn"
            }));
        }
        if (['Running', 'Paused', 'Scheduled'].includes(job.status)) {
            btns.appendChild(UiBuilder.createButton({
                icon_code: 'e5cd',
                hint: 'Interrupt',
                onClick: async () => {
                    await Lobby.postAsync('TaskScheduler/InterruptJob', { id: job.id });
                    await owner.#refresh();
                }, class: "tj-action-btn"
            }));
        }
        if (['Interrupted', 'Failed'].includes(job.status)) {
            btns.appendChild(UiBuilder.createButton({
                icon_code: 'f6b5',
                hint: `Continue from ${pct}%`,
                onClick: async () => {
                    await Lobby.postAsync('TaskScheduler/ContinueJob', { id: job.id });
                    await owner.#refresh();
                }, class: "tj-action-btn"
            }));
        }
        btns.appendChild(UiBuilder.createButton({
            icon_code: 'e872',
            hint: 'Delete',
            onClick: async () => {
                await Lobby.postAsync('TaskScheduler/DeleteJob', { id: job.id });
                await owner.#refresh();
            }, class: "tj-action-btn"
        }));
    }

    // ── Static theme maps ─────────────────────────────────────────────────────

    static #BADGE = {
        Pending: { bg: '#3c3c3c', fg: '#9d9d9d' },
        Scheduled: { bg: '#1a3a6b', fg: '#90caf9' },
        Running: { bg: '#1a4020', fg: '#a5d6a7' },
        Paused: { bg: '#6a3200', fg: '#ffb74d' },
        Completed: { bg: '#1b5e20', fg: '#c8e6c9' },
        Failed: { bg: '#7a1515', fg: '#ef9a9a' },
        Interrupted: { bg: '#333', fg: '#777' },
        default: { bg: '#333', fg: '#aaa' },
    }

    static #BAR = {
        Running: '#2196f3',
        Paused: '#ff9800',
        Scheduled: '#7986cb',
        Completed: '#4caf50',
        Failed: '#ef5350',
        Interrupted: '#757575',
        default: '#555',
    }

    static #onPageFullyLoaded() { }
}
