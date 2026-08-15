window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-client-ui-skin-studio",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/types.ts
		const STORE_KEY = "dsh.skin-studio.v1";
		function createLayer(kind = "image") {
			return {
				id: `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
				kind,
				image: "",
				color: "#6366f1",
				size: "cover",
				scale: 100,
				posX: 50,
				posY: 50,
				position: "center",
				blur: 0,
				opacity: 100,
				feather: 0,
				visible: true
			};
		}
		/** Parse a legacy CSS position string into posX/posY percentages. */
		function positionToXY(position) {
			const pct = /(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/.exec(position);
			if (pct !== null) return {
				posX: Math.max(0, Math.min(100, parseFloat(pct[1]))),
				posY: Math.max(0, Math.min(100, parseFloat(pct[2])))
			};
			return {
				posX: position.includes("left") ? 0 : position.includes("right") ? 100 : 50,
				posY: position.includes("top") ? 0 : position.includes("bottom") ? 100 : 50
			};
		}
		const DEFAULT_SCHEME = {
			version: 1,
			background: {
				enabled: false,
				overlay: .35,
				layers: []
			},
			tokens: {},
			css: "",
			rules: []
		};
		//#endregion
		//#region src/client/store.ts
		/** Shared localStorage-backed scheme store with a tiny subscribe surface. */
		let scheme = load();
		function load() {
			try {
				const raw = localStorage.getItem(STORE_KEY);
				if (raw === null) return structuredClone(DEFAULT_SCHEME);
				return normalize(JSON.parse(raw));
			} catch {
				return structuredClone(DEFAULT_SCHEME);
			}
		}
		function normalize(parsed) {
			const base = structuredClone(DEFAULT_SCHEME);
			const backgroundRaw = parsed.background ?? {};
			const layers = normalizeLayers(backgroundRaw.layers, backgroundRaw);
			return {
				...base,
				...parsed,
				version: 1,
				background: {
					enabled: backgroundRaw.enabled !== false,
					overlay: typeof backgroundRaw.overlay === "number" ? backgroundRaw.overlay : base.background.overlay,
					layers
				},
				tokens: { ...parsed.tokens ?? {} },
				rules: Array.isArray(parsed.rules) ? parsed.rules.map((rule) => ({
					...rule,
					extra: Array.isArray(rule.extra) ? rule.extra : rule.extra != null ? [rule.extra] : void 0
				})) : [],
				css: typeof parsed.css === "string" ? parsed.css : ""
			};
		}
		/** Migrate the pre-layer single-background shape into a one-layer stack. */
		function normalizeLayers(raw, legacy) {
			if (Array.isArray(raw)) return raw.filter((item) => typeof item === "object" && item !== null).map((item) => {
				const layer = createLayer(item.kind === "color" ? "color" : "image");
				const merged = {
					...layer,
					...item,
					id: typeof item.id === "string" ? item.id : layer.id
				};
				if (typeof merged.posX !== "number" || typeof merged.posY !== "number") {
					const xy = positionToXY(merged.position || "center");
					merged.posX = xy.posX;
					merged.posY = xy.posY;
				}
				return merged;
			});
			const legacyImage = typeof legacy.image === "string" ? legacy.image : "";
			if (legacyImage === "") return [];
			const layer = createLayer("image");
			layer.image = legacyImage;
			if (typeof legacy.blur === "number" && legacy.blur > 0) layer.blur = legacy.blur;
			return [layer];
		}
		function save() {
			try {
				localStorage.setItem(STORE_KEY, JSON.stringify(scheme));
			} catch {
				console.warn("[skin-studio] failed to persist scheme (storage quota?)");
			}
		}
		const listeners = /* @__PURE__ */ new Set();
		function notify() {
			for (const listener of listeners) listener();
		}
		const store = {
			get() {
				return scheme;
			},
			update(patch) {
				const applied = typeof patch === "function" ? patch(scheme) : patch;
				scheme = normalize({
					...scheme,
					...applied
				});
				save();
				notify();
			},
			replace(next) {
				scheme = normalize(next);
				save();
				notify();
			},
			reset() {
				scheme = structuredClone(DEFAULT_SCHEME);
				save();
				notify();
			},
			subscribe(listener) {
				listeners.add(listener);
				return () => listeners.delete(listener);
			}
		};
		//#endregion
		//#region src/client/tokens.ts
		/**
		* The tokens users most often want to change. All of them are alias tokens
		* (the layer the theme system expects overrides on); each has a light/dark
		* pair. Sourced from the ui-theme BUILTIN_INSPECT_TOKENS directory.
		*/
		const TOKEN_DIRECTORY = [
			{
				variable: "--dsw-alias-bg-base",
				label: "应用底色",
				group: "surface"
			},
			{
				variable: "--dsw-alias-bg-layer-1",
				label: "一级表面（卡片）",
				group: "surface"
			},
			{
				variable: "--dsw-alias-bg-layer-2",
				label: "二级表面（嵌套）",
				group: "surface"
			},
			{
				variable: "--dsw-alias-bg-overlay",
				label: "浮层/弹窗背景",
				group: "surface"
			},
			{
				variable: "--dsw-specific-sidebar-fill",
				label: "侧边栏底色",
				group: "surface"
			},
			{
				variable: "--dsw-specific-bubble",
				label: "用户气泡底色",
				group: "surface"
			},
			{
				variable: "--dsw-alias-markdown-code-block",
				label: "代码块底色",
				group: "surface"
			},
			{
				variable: "--dsw-alias-button-floating-fill",
				label: "浮动按钮底色",
				group: "surface"
			},
			{
				variable: "--dsw-alias-label-primary",
				label: "主文字",
				group: "text"
			},
			{
				variable: "--dsw-alias-label-secondary",
				label: "次要文字",
				group: "text"
			},
			{
				variable: "--dsw-alias-label-tertiary",
				label: "三级文字",
				group: "text"
			},
			{
				variable: "--dsw-alias-label-caption",
				label: "标注文字",
				group: "text"
			},
			{
				variable: "--dsw-alias-brand-primary",
				label: "品牌强调色",
				group: "accent"
			},
			{
				variable: "--dsw-alias-interactive-bg-hover",
				label: "悬停底色",
				group: "accent"
			},
			{
				variable: "--dsw-alias-interactive-bg-hover-solid",
				label: "悬停底色（实心）",
				group: "accent"
			},
			{
				variable: "--dsw-alias-border-l1",
				label: "边框 L1",
				group: "border"
			},
			{
				variable: "--dsw-alias-border-l2",
				label: "边框 L2",
				group: "border"
			},
			{
				variable: "--dsw-alias-border-l3",
				label: "边框 L3",
				group: "border"
			},
			{
				variable: "--dsw-alias-state-error-primary",
				label: "错误色",
				group: "state"
			},
			{
				variable: "--dsw-alias-state-success-primary",
				label: "成功色",
				group: "state"
			},
			{
				variable: "--dsw-alias-state-warn-primary",
				label: "警告色",
				group: "state"
			},
			{
				variable: "--dsw-alias-scrollbar-bg-l2",
				label: "滚动条滑块",
				group: "scrollbar"
			},
			{
				variable: "--dsw-alias-scrollbar-hover-l2",
				label: "滚动条悬停",
				group: "scrollbar"
			}
		];
		const TOKEN_GROUPS = {
			surface: "表面",
			text: "文字",
			accent: "强调",
			border: "边框",
			state: "状态",
			scrollbar: "滚动条"
		};
		/** Parse a CSS color string to an {r,g,b,a} tuple, or null. */
		function parseColor(value) {
			const trimmed = value.trim();
			const hex = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(trimmed);
			if (hex !== null) {
				let body = hex[1];
				if (body.length === 3) body = [...body].map((ch) => ch + ch).join("");
				return {
					r: parseInt(body.slice(0, 2), 16),
					g: parseInt(body.slice(2, 4), 16),
					b: parseInt(body.slice(4, 6), 16),
					a: 1
				};
			}
			const rgb = /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i.exec(trimmed);
			if (rgb !== null) {
				const alpha = rgb[4] === void 0 ? 1 : parseFloat(rgb[4]);
				return {
					r: Math.round(parseFloat(rgb[1])),
					g: Math.round(parseFloat(rgb[2])),
					b: Math.round(parseFloat(rgb[3])),
					a: rgb[4]?.endsWith("%") ? alpha / 100 : alpha
				};
			}
			return null;
		}
		/** Serialize a color tuple as `rgb(r g b / a)` (alpha omitted when 1). */
		function formatColor(color) {
			const { r, g, b, a } = color;
			return a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgb(${r}, ${g}, ${b}, ${a})`;
		}
		/** Convert a CSS color to `#rrggbb` when it has no alpha, else null. */
		function toHex(value) {
			const parsed = parseColor(value);
			if (parsed === null || parsed.a !== 1) return null;
			const channel = (n) => n.toString(16).padStart(2, "0");
			return `#${channel(parsed.r)}${channel(parsed.g)}${channel(parsed.b)}`;
		}
		/** Convert `#rrggbb` to a `rgb(r, g, b)` string. */
		function fromHex(value) {
			const parsed = parseColor(value);
			if (parsed === null) return null;
			return formatColor(parsed);
		}
		/** Alpha-multiply an opaque or translucent CSS color. */
		function withAlpha(value, alpha) {
			const parsed = parseColor(value);
			if (parsed === null) return value;
			parsed.a = alpha;
			return formatColor(parsed);
		}
		/**
		* Stable DOM hooks that survive client-bundle rebuilds (CSS-module class
		* names are hashed per build and are NOT safe to ship in user CSS). The
		* element picker generates selectors from these anchors. `data-pane` is a
		* forward-facing facade (not present in every build); the `[class*=...]`
		* substring fallbacks mirror the maid-atelier skin's verified selectors and
		* keep picker output working across builds either way.
		*/
		const STABLE_HOOKS = [
			"[data-pane=\"sidebar\"]",
			"[data-slot='sidebar.settings']",
			"[data-slot='sidebar.workspaces']",
			"[data-conversation-scroll]",
			"[data-composer-seat]",
			"[data-composer-card]",
			"[data-input-scroll]",
			"[data-chat-flow]",
			"[data-chat-anchor-key]",
			"[data-turn-tail]",
			"[data-approval-key]",
			"[data-testid=\"todo-panel\"]",
			"[data-queue-dock]",
			"[data-phase='hero']",
			"[data-phase='active']",
			"[data-slot='settings.general.item']",
			"[data-slot='conversation.chat.node']",
			"[data-variant=\"think\"]",
			"[data-decoration=\"token\"]",
			"[data-decoration=\"chip\"]",
			"[data-decoration=\"hint\"]",
			"[class*='sidebarCol']",
			"[class*='centerCol']",
			"[class*='detailsCol']",
			"[class*='frame']",
			"[class*='titleRow']"
		];
		//#endregion
		//#region src/client/apply.ts
		/** Apply engine: turns the persisted scheme into live theme overrides. */
		const SOURCE = "ui-skin-studio";
		/** Opaque palette bases used when the background image is enabled. */
		const SURFACE_BASES = {
			"--dsw-alias-bg-base": {
				light: "rgb(255, 255, 255)",
				dark: "rgb(15, 15, 15)"
			},
			"--dsw-alias-bg-layer-1": {
				light: "rgb(250, 250, 250)",
				dark: "rgb(24, 24, 26)"
			},
			"--dsw-alias-bg-layer-2": {
				light: "rgb(245, 245, 245)",
				dark: "rgb(30, 30, 33)"
			},
			"--dsw-alias-bg-overlay": {
				light: "rgb(255, 255, 255)",
				dark: "rgb(27, 27, 28)"
			},
			"--dsw-specific-sidebar-fill": {
				light: "rgb(245, 246, 247)",
				dark: "rgb(21, 21, 23)"
			}
		};
		/**
		* Surface translucency per token (higher = more opaque).
		* NOTE on stacking: the app paints several translucent layers over the
		* backdrop (body + frame + conversation root all read bg-base), and alpha
		* multiplies. Three 0.8 layers leave only ~4% of the image visible — that is
		* why backgrounds looked "hidden under the chat". These values are tuned so
		* the stacked conversation area shows the image clearly while single-layer
		* surfaces (sidebar, cards, popovers) keep a glass feel.
		*/
		const SURFACE_ALPHA = {
			"--dsw-alias-bg-base": .45,
			"--dsw-alias-bg-layer-1": .7,
			"--dsw-alias-bg-layer-2": .75,
			"--dsw-alias-bg-overlay": .85,
			"--dsw-specific-sidebar-fill": .72
		};
		/** Build the translucent-surface token pairs for the background layer. */
		function translucentSurfaces() {
			const tokens = {};
			for (const [variable, bases] of Object.entries(SURFACE_BASES)) {
				const alpha = SURFACE_ALPHA[variable];
				tokens[variable] = {
					light: withAlpha(bases.light, alpha),
					dark: withAlpha(bases.dark, alpha)
				};
			}
			return tokens;
		}
		/** Compose the final token layer: translucent defaults, then user overrides. */
		function composeTokens(scheme) {
			const tokens = {};
			if (scheme.background.enabled && scheme.background.layers.some((layer) => layer.visible && layer.kind === "image" && layer.image !== "")) Object.assign(tokens, translucentSurfaces());
			for (const [name, pair] of Object.entries(scheme.tokens)) tokens[name] = pair;
			return tokens;
		}
		/** Build the injected stylesheet text for the current scheme. */
		function buildCss(scheme) {
			const parts = [];
			if (scheme.css.trim() !== "") parts.push(`/* ==== user css ==== */\n${scheme.css}`);
			if (scheme.rules.length > 0) {
				parts.push(`/* ==== element picker rules ==== */`);
				for (const rule of scheme.rules) {
					if (rule.selector.trim() === "") continue;
					parts.push(`${rule.selector} {\n${rule.css}\n}`);
					if (rule.extra != null) {
						for (const ex of rule.extra) if (ex.selector.trim() !== "") parts.push(`${ex.selector} {\n${ex.css}\n}`);
					}
				}
			}
			return parts.join("\n\n");
		}
		/** Cache of decoded image sizes (data URLs decode once). */
		const imageSizeCache = /* @__PURE__ */ new Map();
		function loadImageSize(src) {
			const cached = imageSizeCache.get(src);
			if (cached !== void 0) return Promise.resolve(cached);
			return new Promise((resolve) => {
				const probe = new Image();
				probe.onload = () => {
					const size = {
						w: probe.naturalWidth,
						h: probe.naturalHeight
					};
					imageSizeCache.set(src, size);
					resolve(size);
				};
				probe.onerror = () => resolve(null);
				probe.src = src;
			});
		}
		/**
		* Render a contain/custom layer as a real <img> element. Two problems with
		* the background-image approach:
		* 1. contain pins one axis to the viewport, so that axis has ZERO movement
		*    room (`top = posY% * (vh - imgH)` = 0 when imgH == vh) — users could
		*    never move the image up/down.
		* 2. the feather mask applied to the full-viewport div feathers the
		*    VIEWPORT edges; a contained image does not reach the viewport's left
		*    and right edges, so its left/right edges were never feathered.
		* An <img> is positioned by its CENTER (center-anchored: left = posX% * vw
		* - w/2), which always has movement range, and the mask/blur/opacity apply
		* to the image box itself, so feathering follows the IMAGE edges.
		*/
		async function renderImageLayer(layer, entry) {
			const size = await loadImageSize(entry.image);
			if (size === null) return;
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			let w;
			let h;
			if (entry.size === "contain") {
				const scale = Math.min(vw / size.w, vh / size.h);
				w = size.w * scale;
				h = size.h * scale;
			} else {
				w = vw * (Math.max(1, Math.min(300, entry.scale)) / 100);
				h = w * size.h / size.w;
			}
			const left = (entry.posX ?? 50) / 100 * vw - w / 2;
			const top = (entry.posY ?? 50) / 100 * vh - h / 2;
			let img = layer.querySelector("img");
			if (img === null) {
				img = document.createElement("img");
				img.alt = "";
				img.style.position = "absolute";
				layer.append(img);
			}
			img.src = entry.image;
			img.style.left = `${left}px`;
			img.style.top = `${top}px`;
			img.style.width = `${w}px`;
			img.style.height = `${h}px`;
			const blur = Math.max(0, Math.min(60, entry.blur));
			const opacity = Math.max(0, Math.min(100, entry.opacity)) / 100;
			img.style.filter = blur > 0 ? `blur(${blur}px)` : "none";
			img.style.opacity = String(opacity);
			const feather = Math.max(0, Math.min(200, entry.feather));
			if (feather > 0) {
				const mask = [`linear-gradient(to right, transparent 0, black ${feather}px, black calc(100% - ${feather}px), transparent 100%)`, `linear-gradient(to bottom, transparent 0, black ${feather}px, black calc(100% - ${feather}px), transparent 100%)`].join(", ");
				img.style.maskImage = mask;
				img.style.webkitMaskImage = mask;
				img.style.maskComposite = "intersect";
				img.style.webkitMaskComposite = "source-in";
			} else {
				img.style.maskImage = "none";
				img.style.webkitMaskImage = "none";
				img.style.maskComposite = "";
				img.style.webkitMaskComposite = "";
			}
		}
		/**
		* The background is a layer stack of fixed, pointer-transparent divs.
		* body/html background declarations do not reliably paint under the shell
		* (the app paints an opaque `html` background and body background
		* propagation is blocked), so each layer rides its own fixed div — the same
		* composition maid-style skins use — and the surface tokens are made
		* translucent by the theme override layer so the stack shows through them.
		* The first layer is the TOPMOST (z-index -1); later layers sit below.
		*/
		function applyLayerStyle(layer, config, index) {
			const entry = config.layers[index];
			const visible = config.enabled && entry.visible;
			layer.style.display = visible ? "block" : "none";
			layer.style.zIndex = String(-1 - index);
			layer.style.overflow = "hidden";
			if (!visible) return;
			if (entry.kind === "image" && entry.image !== "" && (entry.size === "contain" || entry.size === "custom")) {
				layer.style.backgroundImage = "none";
				layer.style.backgroundColor = "transparent";
				layer.style.filter = "none";
				layer.style.opacity = "";
				layer.style.maskImage = "none";
				layer.style.webkitMaskImage = "none";
				layer.style.maskComposite = "";
				layer.style.webkitMaskComposite = "";
				renderImageLayer(layer, entry);
				return;
			}
			layer.querySelector("img")?.remove();
			if (entry.kind === "color") {
				layer.style.backgroundImage = "none";
				layer.style.backgroundColor = entry.color;
			} else if (entry.image !== "") {
				layer.style.backgroundColor = "transparent";
				layer.style.backgroundImage = `url("${entry.image}")`;
			} else {
				layer.style.backgroundImage = "none";
				layer.style.backgroundColor = "transparent";
			}
			Math.max(1, Math.min(300, entry.scale)) / 100;
			switch (entry.size) {
				case "cover":
					layer.style.backgroundSize = "cover";
					layer.style.backgroundRepeat = "no-repeat";
					break;
				case "stretch":
					layer.style.backgroundSize = "100% 100%";
					layer.style.backgroundRepeat = "no-repeat";
					break;
				case "repeat":
					layer.style.backgroundSize = "auto";
					layer.style.backgroundRepeat = "repeat";
					break;
				default:
					layer.style.backgroundSize = "cover";
					layer.style.backgroundRepeat = "no-repeat";
			}
			layer.style.backgroundPosition = `${entry.posX ?? 50}% ${entry.posY ?? 50}%`;
			const blur = Math.max(0, Math.min(60, entry.blur));
			const opacity = Math.max(0, Math.min(100, entry.opacity)) / 100;
			layer.style.filter = blur > 0 ? `blur(${blur}px)` : "none";
			layer.style.opacity = String(opacity);
			const feather = Math.max(0, Math.min(200, entry.feather));
			if (feather > 0) {
				const mask = [`linear-gradient(to right, transparent 0, black ${feather}px, black calc(100% - ${feather}px), transparent 100%)`, `linear-gradient(to bottom, transparent 0, black ${feather}px, black calc(100% - ${feather}px), transparent 100%)`].join(", ");
				layer.style.maskImage = mask;
				layer.style.webkitMaskImage = mask;
				layer.style.maskComposite = "intersect";
				layer.style.webkitMaskComposite = "source-in";
				layer.style.maskSize = "";
				layer.style.webkitMaskSize = "";
			} else {
				layer.style.maskImage = "none";
				layer.style.webkitMaskImage = "none";
				layer.style.maskSize = "";
				layer.style.webkitMaskSize = "";
				layer.style.maskComposite = "";
				layer.style.webkitMaskComposite = "";
			}
		}
		/**
		* Reconcile the layer-stack container with the scheme's layers: grow/shrink
		* the owned divs to match, then apply each layer's style. The global
		* darkening veil is a SEPARATE fixed div (never a child of the container —
		* children are addressed by index and a stray child would be treated as a
		* layer).
		*/
		function syncBackgroundLayers(container, veil, scheme) {
			const config = scheme.background;
			const layers = config.enabled ? config.layers : [];
			while (container.children.length < layers.length) {
				const div = document.createElement("div");
				div.dataset.skinStudio = "backdrop-layer";
				div.style.cssText = "position:fixed;inset:0;pointer-events:none;display:none;";
				container.append(div);
			}
			while (container.children.length > layers.length) container.lastElementChild?.remove();
			for (let index = 0; index < layers.length; index += 1) {
				const div = container.children[index];
				if (div !== void 0) applyLayerStyle(div, config, index);
			}
			if (config.enabled) {
				const mask = Math.max(0, Math.min(.9, config.overlay)).toFixed(2);
				veil.style.display = "block";
				veil.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, ${mask}), rgba(0, 0, 0, ${mask}))`;
			} else veil.style.display = "none";
		}
		/**
		* Bind the apply engine to a theme service and the store. Owns:
		* - the `body[data-skin-studio]` marker
		* - the fixed backdrop layer stack for the background
		* - the overrideTokens layer (disposed on dispose())
		* - the user stylesheet <style> element
		* @param theme - the ThemeRuntime service.
		* @returns a handle the caller hangs on its cordis effect.
		*/
		function bindApply(theme) {
			document.body.dataset.skinStudio = "";
			const styleEl = document.createElement("style");
			styleEl.dataset.plugin = SOURCE;
			styleEl.dataset.pluginCss = "ui-skin-studio/user";
			document.head.append(styleEl);
			const backdrop = document.createElement("div");
			backdrop.dataset.skinStudio = "backdrop";
			backdrop.style.cssText = "position:fixed;inset:0;z-index:-1;pointer-events:none;";
			const veil = document.createElement("div");
			veil.dataset.skinStudio = "backdrop-veil";
			veil.style.cssText = "position:fixed;inset:0;z-index:-1000;pointer-events:none;display:none;";
			document.body.append(backdrop, veil);
			let disposeOverrides = null;
			const reapply = () => {
				const scheme = store.get();
				disposeOverrides?.();
				disposeOverrides = theme.overrideTokens(SOURCE, composeTokens(scheme));
				syncBackgroundLayers(backdrop, veil, scheme);
				styleEl.textContent = buildCss(scheme);
			};
			const offStore = store.subscribe(reapply);
			reapply();
			const dispose = () => {
				offStore();
				disposeOverrides?.();
				disposeOverrides = null;
				styleEl.remove();
				backdrop.remove();
				veil.remove();
				delete document.body.dataset.skinStudio;
			};
			return {
				reapply,
				dispose
			};
		}
		//#endregion
		//#region src/client/picker.ts
		/**
		* Element picker toolbar: hover-highlight, stable-selector generation, quick
		* paint, and a Word-style format pane — click an element, then set fill
		* (none / solid / gradient with direction + strength) and soft edges
		* (blur strength + range) with live preview; changes save immediately.
		*/
		const PICKER_ATTR = "data-skin-studio-picker";
		const TOOLBAR_STYLE = `
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid var(--dsw-alias-border-l2, #ccc);
  border-radius: 999px;
  background: var(--dsw-alias-bg-overlay, #fff);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
`;
		const TOOL_BUTTON_STYLE = `
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-primary, #111);
  font: 600 12px/1 var(--dsw-font-family, system-ui, sans-serif);
  cursor: pointer;
  white-space: nowrap;
`;
		const ACTIVE_BUTTON_STYLE = `
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: #fff;
  border-color: transparent;
`;
		/** Attribute names considered stable enough to ship in a user selector. */
		const STABLE_ATTRS = [
			"data-slot",
			"data-pane",
			"data-phase",
			"data-chat-flow",
			"data-chat-flow-kind",
			"data-variant",
			"data-testid",
			"data-state",
			"data-status",
			"data-side",
			"data-decoration",
			"data-error",
			"data-streaming",
			"data-active",
			"data-compaction-disclosure",
			"data-context-source",
			"data-time-hover-root"
		];
		const CSS_ESCAPE_ATTR = /["\\]/g;
		function attrSelector(name, value) {
			return `[${name}="${value.replace(CSS_ESCAPE_ATTR, "\\$&")}"]`;
		}
		function stableSelfSelector(element) {
			for (const name of STABLE_ATTRS) {
				const value = element.getAttribute(name);
				if (value === null || value === "") continue;
				const selector = attrSelector(name, value);
				if (document.querySelectorAll(selector).length === 1) return selector;
			}
			return null;
		}
		function nthPath(element, until) {
			const chain = [];
			let current = element;
			while (current !== null && current !== until && current !== document.body && current !== document.documentElement) {
				const tag = current.tagName.toLowerCase();
				const parent = current.parentElement;
				if (parent === null) {
					chain.unshift(tag);
					break;
				}
				const index = [...parent.children].indexOf(current) + 1;
				chain.unshift(`${tag}:nth-child(${index})`);
				current = parent;
			}
			return chain.join(" > ");
		}
		/**
		* Generate a stable selector for an element. Priority:
		* 1. unique stable data-attribute on the element itself
		* 2. nearest stable ancestor hook + nth-child path down to the element
		* 3. absolute tag/nth-child path from body
		* The result is validated against the live DOM and refined with
		* `:nth-of-type` when it addresses more than one element.
		*/
		function generateSelector(element) {
			const self = stableSelfSelector(element);
			if (self !== null) return self;
			const selfHook = STABLE_HOOKS.find((hook) => element.matches(hook));
			if (selfHook !== void 0 && document.querySelectorAll(selfHook).length === 1) return selfHook;
			const anchor = element.closest(STABLE_HOOKS.join(","));
			let selector;
			if (anchor !== null && anchor !== element) selector = `${anchorTagSelector(anchor)} > ${nthPath(element, anchor)}`;
			else selector = `body > ${nthPath(element, document.body)}`;
			let matches = document.querySelectorAll(selector);
			let depth = 0;
			while (matches.length > 1 && depth < 8) {
				selector = refineWithNthOfType(selector, element, depth);
				matches = document.querySelectorAll(selector);
				depth += 1;
			}
			return selector;
		}
		/** A stable hook element may itself be ambiguous across panes; use the hook selector verbatim. */
		function anchorTagSelector(anchor) {
			const self = stableSelfSelector(anchor);
			if (self !== null) return self;
			return STABLE_HOOKS.find((hook) => anchor.matches(hook)) ?? anchor.tagName.toLowerCase();
		}
		function refineWithNthOfType(selector, element, depth) {
			const parts = selector.split(" > ");
			if ((parts.at(-1) ?? "").includes(":nth-of-type")) return selector;
			const tag = element.tagName.toLowerCase();
			const parent = element.parentElement;
			if (parent === null) return selector;
			const refined = `${tag}:nth-of-type(${[...parent.children].filter((child) => child.tagName === element.tagName).indexOf(element) + 1})`;
			parts[parts.length - 1] = refined;
			return parts.join(" > ");
		}
		const PANEL_STYLE = `
  position: fixed;
  right: 16px;
  bottom: 84px;
  width: min(360px, calc(100vw - 32px));
  max-height: 62vh;
  z-index: 2147483646;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--dsw-alias-border-l2, #ccc);
  border-radius: 12px;
  background: var(--dsw-alias-bg-overlay, #fff);
  color: var(--dsw-alias-label-primary, #111);
  font: 400 13px/1.5 var(--dsw-font-family, system-ui, sans-serif);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
  overflow: auto;
`;
		function defaultFormat() {
			return {
				fill: "solid",
				color: "#6366f1",
				gradType: "linear",
				angle: 45,
				c1: "#a78bfa",
				c2: "#6366f1",
				strength: 100,
				soft: false,
				blur: 12,
				spread: 6
			};
		}
		/** Fill value without the `background:` prefix (for layering). */
		function fillValue(state) {
			if (state.fill === "solid") return state.color;
			if (state.fill === "gradient") {
				const start = Math.max(0, Math.round((100 - state.strength) / 2));
				const end = 100 - start;
				if (state.gradType === "linear") return `linear-gradient(${state.angle}deg, ${state.c1} ${start}%, ${state.c2} ${end}%)`;
				return `radial-gradient(circle, ${state.c1} ${start}%, ${state.c2} ${end}%)`;
			}
			return "none";
		}
		/**
		* The nearest ancestor (or the element's backdrop) that has a visible
		* background — the color the soft edge should feather INTO.
		*/
		function findEdgeColor(element) {
			let current = element.parentElement;
			while (current !== null && current !== document.documentElement) {
				const bg = getComputedStyle(current).backgroundColor;
				if (bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
				current = current.parentElement;
			}
			return "rgba(0, 0, 0, 0)";
		}
		/** Build the CSS declaration block text for a format state. Generated
		* declarations carry `!important` — the pane is Word-style "make it so":
		* product rules (e.g. the sidebar column's own background) would otherwise
		* out-specify the generated selectors. Hand-edits in the textarea stay as
		* written. */
		function buildFormat(state, element, selector) {
			const declarations = [];
			const softWidth = state.soft ? state.blur + state.spread : 0;
			if (state.fill === "none") declarations.push("background: none !important;");
			else if (state.soft && softWidth > 0) {
				const edge = findEdgeColor(element);
				declarations.push(`background:\n  linear-gradient(to right, transparent 0%, transparent calc(100% - ${softWidth}px), ${edge} 100%),\n  ${fillValue(state)} !important;`);
			} else declarations.push(`background: ${fillValue(state)} !important;`);
			if (state.soft) {
				const base = state.fill === "solid" ? state.color : state.fill === "gradient" ? state.c2 : "rgba(0, 0, 0, 0.35)";
				declarations.push(`box-shadow: inset 0 0 ${state.blur}px ${state.spread}px color-mix(in srgb, #ffffff 55%, transparent), 0 0 ${state.blur}px ${state.spread}px color-mix(in srgb, ${base} 70%, transparent) !important;`);
			}
			const extras = [];
			if (state.soft) {
				const softEdge = buildSoftEdgeExtra(state, element, softWidth);
				if (softEdge !== null) extras.push(softEdge);
			}
			const fadeSuppression = buildFadeSuppression(element, selector);
			if (fadeSuppression !== null) extras.push(fadeSuppression);
			return {
				css: declarations.join("\n"),
				extra: extras.length > 0 ? extras : void 0
			};
		}
		/**
		* Companion rule that strips product fade layers inside the painted
		* container (e.g. the sidebar's list-bottom `[class*='fade']` span, a white
		* gradient veil sitting above the settings footer). The fade is pure
		* decoration (the maid skin removes it the same way); without this rule it
		* paints over the user's fill, leaving a pale band.
		*/
		function buildFadeSuppression(element, selector) {
			if (element.querySelector("[class*=\"fade\"]") === null) return null;
			return {
				selector: `${selector} [class*='fade']`,
				css: "background: none !important;"
			};
		}
		/**
		* Companion rule for the soft edge: panel divider lines (e.g. the sidebar
		* column's `border-right`) live on ANCESTORS of the painted element, where
		* the element's own inset shadow cannot reach. Walk the ancestor chain and
		* target the NEAREST ancestor that actually has a visible border: make its
		* border transparent AND feather its own background out at the right edge,
		* so the painted region blends through it into the app surface instead of
		* ending at a hard color seam.
		*/
		function buildSoftEdgeExtra(state, element, softWidth) {
			let current = element.parentElement;
			let depth = 0;
			while (current !== null && current !== document.body && current !== document.documentElement && depth < 5) {
				const cs = getComputedStyle(current);
				if ([
					"Left",
					"Right",
					"Top",
					"Bottom"
				].some((side) => {
					const width = parseFloat(cs[`border${side}Width`]);
					const color = cs[`border${side}Color`];
					return width > 0 && color !== "rgba(0, 0, 0, 0)" && color !== "transparent";
				})) {
					const declarations = ["border-color: transparent !important;"];
					const selfBg = cs.backgroundColor;
					if (softWidth > 0 && selfBg !== "rgba(0, 0, 0, 0)" && selfBg !== "transparent") declarations.push(`background: linear-gradient(to right, ${selfBg} 0%, ${selfBg} calc(100% - ${softWidth}px), transparent 100%) !important;`);
					declarations.push(`box-shadow: inset 0 0 ${state.blur}px ${state.spread}px color-mix(in srgb, #ffffff 55%, transparent) !important;`);
					return {
						selector: generateSelector(current),
						css: declarations.join("\n")
					};
				}
				current = current.parentElement;
				depth += 1;
			}
			return null;
		}
		/** UI preferences kept OUT of the theme scheme (not exported with it). */
		const UI_KEY = "dsh.skin-studio.ui";
		function loadToolbarUi() {
			try {
				const raw = localStorage.getItem(UI_KEY);
				if (raw === null) return {
					visible: true,
					x: null,
					y: null
				};
				const parsed = JSON.parse(raw);
				return {
					visible: parsed.visible !== false,
					x: typeof parsed.x === "number" ? parsed.x : null,
					y: typeof parsed.y === "number" ? parsed.y : null
				};
			} catch {
				return {
					visible: true,
					x: null,
					y: null
				};
			}
		}
		function saveToolbarUi(ui) {
			try {
				localStorage.setItem(UI_KEY, JSON.stringify(ui));
			} catch {}
		}
		function mountPicker() {
			let picking = false;
			let painting = false;
			let paintColor = "#6366f1";
			let highlightEl = null;
			let panelEl = null;
			let previewTag = null;
			let flashTimers = [];
			const toolbar = document.createElement("div");
			toolbar.dataset.skinStudioPicker = "toolbar";
			toolbar.style.cssText = TOOLBAR_STYLE;
			const handle = document.createElement("span");
			handle.dataset.skinStudioPicker = "handle";
			handle.textContent = "⠿";
			handle.title = "拖动调整位置";
			handle.style.cssText = `
    cursor: grab;
    user-select: none;
    padding: 0 4px;
    color: var(--dsw-alias-label-tertiary, #888);
    font-size: 13px;
    line-height: 1;
  `;
			toolbar.append(handle);
			const pickBtn = document.createElement("button");
			pickBtn.type = "button";
			pickBtn.dataset.skinStudioPicker = "toggle";
			pickBtn.textContent = "🎨 拾取";
			pickBtn.style.cssText = TOOL_BUTTON_STYLE;
			toolbar.append(pickBtn);
			const paintBtn = document.createElement("button");
			paintBtn.type = "button";
			paintBtn.dataset.skinStudioPicker = "paint";
			paintBtn.textContent = "🖌️ 涂色";
			paintBtn.style.cssText = TOOL_BUTTON_STYLE;
			toolbar.append(paintBtn);
			const colorInput = document.createElement("input");
			colorInput.type = "color";
			colorInput.dataset.skinStudioPicker = "color";
			colorInput.value = paintColor;
			colorInput.title = "涂色使用的颜色";
			colorInput.style.cssText = `
    width: 30px;
    height: 26px;
    padding: 0;
    border: 1px solid var(--dsw-alias-border-l2, #ccc);
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
  `;
			colorInput.addEventListener("input", () => {
				paintColor = colorInput.value;
			});
			toolbar.append(colorInput);
			let ui = loadToolbarUi();
			const setVisibleImpl = (visible) => {
				ui = {
					...ui,
					visible
				};
				toolbar.style.display = visible ? "flex" : "none";
				saveToolbarUi(ui);
				if (!visible) {
					setPicking(false);
					setPainting(false);
					closePanel();
					hideHighlight();
				}
			};
			const applyPosition = () => {
				if (ui.x !== null && ui.y !== null) {
					toolbar.style.right = "auto";
					toolbar.style.bottom = "auto";
					toolbar.style.left = `${ui.x}px`;
					toolbar.style.top = `${ui.y}px`;
				}
			};
			applyPosition();
			let dragging = false;
			let dragOffsetX = 0;
			let dragOffsetY = 0;
			let dragMoved = false;
			const onDragMove = (event) => {
				if (!dragging) return;
				event.preventDefault();
				const x = Math.max(8, Math.min(window.innerWidth - 60, event.clientX - dragOffsetX));
				const y = Math.max(8, Math.min(window.innerHeight - 44, event.clientY - dragOffsetY));
				toolbar.style.right = "auto";
				toolbar.style.bottom = "auto";
				toolbar.style.left = `${x}px`;
				toolbar.style.top = `${y}px`;
				dragMoved = true;
			};
			const onDragUp = () => {
				if (!dragging) return;
				dragging = false;
				handle.style.cursor = "grab";
				if (dragMoved) {
					ui = {
						...ui,
						x: parseFloat(toolbar.style.left),
						y: parseFloat(toolbar.style.top)
					};
					saveToolbarUi(ui);
				}
				window.removeEventListener("pointermove", onDragMove, true);
				window.removeEventListener("pointerup", onDragUp, true);
			};
			handle.addEventListener("pointerdown", (event) => {
				event.preventDefault();
				event.stopPropagation();
				const rect = toolbar.getBoundingClientRect();
				dragging = true;
				dragMoved = false;
				dragOffsetX = event.clientX - rect.left;
				dragOffsetY = event.clientY - rect.top;
				handle.style.cursor = "grabbing";
				window.addEventListener("pointermove", onDragMove, true);
				window.addEventListener("pointerup", onDragUp, true);
			});
			document.body.append(toolbar);
			const onMove = (event) => {
				if (!picking && !painting) return;
				const target = event.target instanceof Element ? event.target : null;
				if (target === null || target.closest(`[${PICKER_ATTR}]`) !== null) {
					hideHighlight();
					return;
				}
				if (highlightEl === null) {
					highlightEl = document.createElement("div");
					highlightEl.dataset.skinStudioPicker = "highlight";
					highlightEl.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 2147483645;
        pointer-events: none;
        border: 2px dashed #f59e0b;
        background: rgba(245, 158, 11, 0.10);
        border-radius: 4px;
        box-sizing: border-box;
      `;
					document.body.append(highlightEl);
				}
				const rect = target.getBoundingClientRect();
				highlightEl.style.left = `${rect.left}px`;
				highlightEl.style.top = `${rect.top}px`;
				highlightEl.style.width = `${rect.width}px`;
				highlightEl.style.height = `${rect.height}px`;
				highlightEl.style.display = "block";
			};
			const hideHighlight = () => {
				if (highlightEl !== null) highlightEl.style.display = "none";
			};
			const clearFlash = () => {
				for (const timer of flashTimers) clearTimeout(timer);
				flashTimers = [];
			};
			/** Brief green outline on a freshly painted element. */
			const flash = (element) => {
				const target = element instanceof HTMLElement ? element : element.parentElement;
				if (target === null) return;
				target.style.outline = "2px solid #22c55e";
				target.style.outlineOffset = "2px";
				flashTimers.push(window.setTimeout(() => {
					target.style.outline = "";
					target.style.outlineOffset = "";
				}, 450));
			};
			const paintTarget = (element) => {
				let current = element;
				while (current !== null && current !== document.documentElement) {
					const bg = getComputedStyle(current).backgroundColor;
					if (bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return current;
					current = current.parentElement;
				}
				return element;
			};
			const paintAt = (element) => {
				const target = paintTarget(element);
				const selector = generateSelector(target);
				const fadeSuppression = buildFadeSuppression(target, selector);
				store.update((current) => {
					return { rules: [...current.rules.filter((rule) => rule.selector !== selector), {
						selector,
						css: `background: ${paintColor} !important;`,
						extra: fadeSuppression !== null ? [fadeSuppression] : void 0
					}] };
				});
				flash(target);
			};
			const clearPreview = () => {
				previewTag?.remove();
				previewTag = null;
			};
			const setPreview = (selector, css) => {
				if (previewTag === null) {
					previewTag = document.createElement("style");
					previewTag.dataset.pluginCss = "ui-skin-studio/picker-preview";
					document.head.append(previewTag);
				}
				previewTag.textContent = selector === "" || css === "" ? "" : `${selector} {\n${css}\n}`;
			};
			/** Save the current pane state as the rule for the given selector. */
			const commitRule = (selector, css, extra) => {
				const sel = selector.trim();
				if (sel === "") return;
				store.update((current) => {
					return { rules: [...current.rules.filter((rule) => rule.selector !== sel), {
						selector: sel,
						css,
						extra
					}] };
				});
			};
			const openPanel = (element) => {
				closePanel();
				const selector = generateSelector(element);
				const existing = store.get().rules.find((rule) => rule.selector === selector);
				const state = {
					...defaultFormat(),
					color: paintColor,
					c2: paintColor
				};
				panelEl = document.createElement("div");
				panelEl.dataset.skinStudioPicker = "panel";
				panelEl.style.cssText = PANEL_STYLE;
				const header = document.createElement("div");
				header.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;";
				header.textContent = "格式窗格";
				const closeBtn = document.createElement("button");
				closeBtn.type = "button";
				closeBtn.textContent = "✕";
				closeBtn.style.cssText = "border:0;background:transparent;cursor:pointer;color:inherit;font-size:14px;";
				closeBtn.addEventListener("click", () => {
					closePanel();
					hideHighlight();
				});
				header.append(closeBtn);
				panelEl.append(header);
				const selHint = document.createElement("div");
				selHint.textContent = "选择器（稳定钩子优先，修改后即时生效）";
				selHint.style.cssText = "color:var(--dsw-alias-label-tertiary,#888);font-size:12px;";
				panelEl.append(selHint);
				const selectorInput = document.createElement("input");
				selectorInput.value = selector;
				selectorInput.spellcheck = false;
				selectorInput.style.cssText = `
      width: 100%;
      box-sizing: border-box;
      padding: 6px 8px;
      border: 1px solid var(--dsw-alias-border-l1,#ddd);
      border-radius: 6px;
      background: var(--dsw-alias-bg-layer-1,#fafafa);
      color: inherit;
      font: 500 12px/1.4 var(--ds-font-family-code, monospace);
    `;
				panelEl.append(selectorInput);
				const section = (title) => {
					const div = document.createElement("div");
					div.style.cssText = "display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--dsw-alias-border-l1,#ddd);padding-top:8px;";
					const label = document.createElement("div");
					label.textContent = title;
					label.style.cssText = "color:var(--dsw-alias-label-secondary,#666);font-size:12px;font-weight:600;";
					div.append(label);
					return div;
				};
				const fillSection = section("填充");
				const fillRow = document.createElement("div");
				fillRow.style.cssText = "display:flex;gap:6px;";
				const fillButtons = {
					none: segBtn("无", "none"),
					solid: segBtn("纯色", "solid"),
					gradient: segBtn("渐变", "gradient")
				};
				for (const [key, btn] of Object.entries(fillButtons)) fillRow.append(btn);
				fillSection.append(fillRow);
				panelEl.append(fillSection);
				const solidRow = document.createElement("div");
				solidRow.style.cssText = "display:flex;align-items:center;gap:8px;";
				const solidColor = colorPicker(state.color, (value) => {
					state.color = value;
					paintColor = value;
					colorInput.value = value;
					refresh();
				});
				const solidLabel = document.createElement("span");
				solidLabel.textContent = "颜色";
				solidLabel.style.cssText = "color:var(--dsw-alias-label-tertiary,#888);font-size:12px;";
				solidRow.append(solidColor, solidLabel);
				fillSection.append(solidRow);
				const gradSection = section("渐变");
				const gradTypeRow = document.createElement("div");
				gradTypeRow.style.cssText = "display:flex;gap:6px;";
				const gradTypeButtons = {
					linear: segBtn("线性", "linear"),
					radial: segBtn("径向", "radial")
				};
				for (const btn of Object.values(gradTypeButtons)) gradTypeRow.append(btn);
				gradSection.append(gradTypeRow);
				const angleRow = sliderRow("方向角度", 0, 360, state.angle, (value) => {
					state.angle = value;
					refresh();
				});
				gradSection.append(angleRow);
				const c1Row = document.createElement("div");
				c1Row.style.cssText = "display:flex;align-items:center;gap:8px;";
				const c1Picker = colorPicker(state.c1, (value) => {
					state.c1 = value;
					refresh();
				});
				const c1Label = document.createElement("span");
				c1Label.textContent = "起始色";
				c1Label.style.cssText = "color:var(--dsw-alias-label-tertiary,#888);font-size:12px;";
				c1Row.append(c1Picker, c1Label);
				gradSection.append(c1Row);
				const c2Row = document.createElement("div");
				c2Row.style.cssText = "display:flex;align-items:center;gap:8px;";
				const c2Picker = colorPicker(state.c2, (value) => {
					state.c2 = value;
					paintColor = value;
					colorInput.value = value;
					refresh();
				});
				const c2Label = document.createElement("span");
				c2Label.textContent = "结束色";
				c2Label.style.cssText = "color:var(--dsw-alias-label-tertiary,#888);font-size:12px;";
				c2Row.append(c2Picker, c2Label);
				gradSection.append(c2Row);
				const strengthRow = sliderRow("渐变强度", 10, 100, state.strength, (value) => {
					state.strength = value;
					refresh();
				});
				gradSection.append(strengthRow);
				panelEl.append(gradSection);
				const softSection = section("边缘柔化");
				const softRow = document.createElement("div");
				softRow.style.cssText = "display:flex;align-items:center;gap:8px;";
				const softToggle = document.createElement("input");
				softToggle.type = "checkbox";
				softToggle.checked = state.soft;
				softToggle.addEventListener("change", () => {
					state.soft = softToggle.checked;
					refresh();
				});
				const softLabel = document.createElement("span");
				softLabel.textContent = "启用柔化";
				softLabel.style.cssText = "color:var(--dsw-alias-label-secondary,#666);font-size:13px;";
				softRow.append(softToggle, softLabel);
				softSection.append(softRow);
				const blurRow = sliderRow("模糊强度", 0, 60, state.blur, (value) => {
					state.blur = value;
					refresh();
				});
				softSection.append(blurRow);
				const spreadRow = sliderRow("模糊范围", 0, 60, state.spread, (value) => {
					state.spread = value;
					refresh();
				});
				softSection.append(spreadRow);
				panelEl.append(softSection);
				const cssLabel = document.createElement("div");
				cssLabel.textContent = "生成的 CSS（可手动微调，改动即生效）";
				cssLabel.style.cssText = "color:var(--dsw-alias-label-tertiary,#888);font-size:12px;border-top:1px solid var(--dsw-alias-border-l1,#ddd);padding-top:8px;";
				panelEl.append(cssLabel);
				const cssInput = document.createElement("textarea");
				cssInput.value = existing?.css ?? buildFormat(state, element, selector).css;
				cssInput.spellcheck = false;
				cssInput.rows = 5;
				cssInput.style.cssText = `
      width: 100%;
      box-sizing: border-box;
      padding: 6px 8px;
      border: 1px solid var(--dsw-alias-border-l1,#ddd);
      border-radius: 6px;
      background: var(--dsw-alias-bg-layer-1,#fafafa);
      color: inherit;
      font: 400 12px/1.5 var(--ds-font-family-code, monospace);
      resize: vertical;
    `;
				panelEl.append(cssInput);
				const actions = document.createElement("div");
				actions.style.cssText = "display:flex;gap:8px;justify-content:flex-end;";
				const removeBtn = document.createElement("button");
				removeBtn.type = "button";
				removeBtn.textContent = "删除";
				removeBtn.style.cssText = btnStyle("var(--dsw-alias-bg-layer-2,#eee)", "inherit");
				removeBtn.addEventListener("click", () => {
					store.update((current) => ({ rules: current.rules.filter((rule) => rule.selector !== selectorInput.value.trim()) }));
					closePanel();
					hideHighlight();
				});
				actions.append(removeBtn);
				const doneBtn = document.createElement("button");
				doneBtn.type = "button";
				doneBtn.textContent = "完成";
				doneBtn.style.cssText = btnStyle("#6366f1", "#fff");
				doneBtn.addEventListener("click", () => {
					closePanel();
					hideHighlight();
				});
				actions.append(doneBtn);
				panelEl.append(actions);
				document.body.append(panelEl);
				const currentCss = () => cssInput.value.trim();
				const refresh = () => {
					const result = buildFormat(state, element, selectorInput.value);
					cssInput.value = result.css;
					syncUi();
					commitRule(selectorInput.value, result.css, result.extra);
					setPreview(selectorInput.value, currentCss());
				};
				const syncUi = () => {
					const fill = state.fill;
					for (const [key, btn] of Object.entries(fillButtons)) btn.style.cssText = TOOL_BUTTON_STYLE + (key === fill ? ACTIVE_BUTTON_STYLE : "");
					for (const [key, btn] of Object.entries(gradTypeButtons)) btn.style.cssText = TOOL_BUTTON_STYLE + (key === state.gradType ? ACTIVE_BUTTON_STYLE : "");
					solidRow.style.display = fill === "solid" ? "flex" : "none";
					gradSection.style.display = fill === "gradient" ? "flex" : "none";
					angleRow.style.display = fill === "gradient" && state.gradType === "linear" ? "flex" : "none";
					blurRow.style.display = state.soft ? "flex" : "none";
					spreadRow.style.display = state.soft ? "flex" : "none";
				};
				const syncSliderLabels = () => {
					const pairs = [[angleRow.querySelector("input"), angleRow.querySelector(".value")]];
					for (const [input, valueEl] of pairs) if (input !== null && valueEl !== null) valueEl.textContent = `${input.value}°`;
					const strengthInput = strengthRow.querySelector("input");
					const strengthValue = strengthRow.querySelector(".value");
					if (strengthInput !== null && strengthValue !== null) strengthValue.textContent = `${strengthInput.value}%`;
					const blurInput = blurRow.querySelector("input");
					const blurValue = blurRow.querySelector(".value");
					if (blurInput !== null && blurValue !== null) blurValue.textContent = `${blurInput.value}px`;
					const spreadInput = spreadRow.querySelector("input");
					const spreadValue = spreadRow.querySelector(".value");
					if (spreadInput !== null && spreadValue !== null) spreadValue.textContent = `${spreadInput.value}px`;
				};
				syncSliderLabels();
				syncUi();
				selectorInput.addEventListener("input", () => {
					commitRule(selectorInput.value, currentCss());
					setPreview(selectorInput.value, currentCss());
				});
				cssInput.addEventListener("input", () => {
					commitRule(selectorInput.value, currentCss());
					setPreview(selectorInput.value, currentCss());
				});
				for (const [key, btn] of Object.entries(fillButtons)) btn.addEventListener("click", () => {
					state.fill = key;
					refresh();
				});
				for (const [key, btn] of Object.entries(gradTypeButtons)) btn.addEventListener("click", () => {
					state.gradType = key;
					refresh();
				});
				if (existing === void 0) {
					const result = buildFormat(state, element, selector);
					commitRule(selector, result.css, result.extra);
				}
				setPreview(selector, existing?.css ?? buildFormat(state, element, selector).css);
				selectorInput.focus();
				selectorInput.select();
				function segBtn(text, _key) {
					const btn = document.createElement("button");
					btn.type = "button";
					btn.textContent = text;
					btn.style.cssText = TOOL_BUTTON_STYLE;
					return btn;
				}
				function colorPicker(initial, onChange) {
					const input = document.createElement("input");
					input.type = "color";
					input.value = initial;
					input.style.cssText = "width:30px;height:26px;padding:0;border:1px solid var(--dsw-alias-border-l2,#ccc);border-radius:8px;background:transparent;cursor:pointer;";
					input.addEventListener("input", () => onChange(input.value));
					return input;
				}
				function sliderRow(labelText, min, max, initial, onChange) {
					const row = document.createElement("div");
					row.style.cssText = "display:flex;align-items:center;gap:8px;";
					const label = document.createElement("span");
					label.textContent = labelText;
					label.style.cssText = "color:var(--dsw-alias-label-tertiary,#888);font-size:12px;flex:none;";
					const input = document.createElement("input");
					input.type = "range";
					input.min = String(min);
					input.max = String(max);
					input.value = String(initial);
					input.style.cssText = "flex:1;min-width:0;";
					const value = document.createElement("span");
					value.className = "value";
					value.textContent = String(initial);
					value.style.cssText = "color:var(--dsw-alias-label-tertiary,#888);font-size:12px;flex:none;width:34px;text-align:right;";
					input.addEventListener("input", () => {
						const next = Number(input.value);
						value.textContent = labelText.includes("方向") ? `${next}°` : labelText.includes("强度") ? `${next}%` : `${next}px`;
						onChange(next);
					});
					row.append(label, input, value);
					return row;
				}
			};
			const closePanel = () => {
				clearPreview();
				panelEl?.remove();
				panelEl = null;
			};
			const onClick = (event) => {
				if (!picking && !painting) return;
				const target = event.target instanceof Element ? event.target : null;
				if (target === null || target.closest(`[${PICKER_ATTR}]`) !== null) return;
				event.preventDefault();
				event.stopPropagation();
				hideHighlight();
				if (painting) paintAt(target);
				else {
					setPicking(false);
					openPanel(target);
				}
			};
			const onKey = (event) => {
				if (!picking && !painting) return;
				if (event.key === "Escape") {
					event.preventDefault();
					setPicking(false);
					setPainting(false);
					hideHighlight();
					closePanel();
				}
			};
			const setPicking = (next) => {
				if (next) setPainting(false);
				picking = next;
				pickBtn.textContent = next ? "✕ 取消" : "🎨 拾取";
				pickBtn.style.cssText = TOOL_BUTTON_STYLE + (next ? ACTIVE_BUTTON_STYLE : "");
				if (!next) hideHighlight();
			};
			const setPainting = (next) => {
				if (next) {
					setPicking(false);
					closePanel();
				}
				painting = next;
				paintBtn.textContent = next ? "✕ 取消" : "🖌️ 涂色";
				paintBtn.style.cssText = TOOL_BUTTON_STYLE + (next ? ACTIVE_BUTTON_STYLE : "");
				if (!next) hideHighlight();
			};
			pickBtn.addEventListener("click", () => {
				if (picking) {
					setPicking(false);
					hideHighlight();
					closePanel();
				} else setPicking(true);
			});
			paintBtn.addEventListener("click", () => {
				if (painting) {
					setPainting(false);
					hideHighlight();
				} else setPainting(true);
			});
			document.addEventListener("pointermove", onMove, true);
			document.addEventListener("click", onClick, true);
			document.addEventListener("keydown", onKey, true);
			setVisibleImpl(ui.visible);
			return {
				toggle() {
					setPicking(!picking);
				},
				active() {
					return picking;
				},
				setVisible(visible) {
					setVisibleImpl(visible);
				},
				dispose() {
					setPicking(false);
					setPainting(false);
					closePanel();
					hideHighlight();
					clearFlash();
					highlightEl?.remove();
					toolbar.remove();
					document.removeEventListener("pointermove", onMove, true);
					document.removeEventListener("click", onClick, true);
					document.removeEventListener("keydown", onKey, true);
				}
			};
		}
		function btnStyle(bg, color) {
			return `
    padding: 6px 12px;
    border: 1px solid var(--dsw-alias-border-l2,#ccc);
    border-radius: 8px;
    background: ${bg};
    color: ${color};
    font: 600 12px/1 var(--dsw-font-family, system-ui, sans-serif);
    cursor: pointer;
  `;
		}
		let pickerController = null;
		/** Read the persisted toolbar visibility (settings-row checkbox initial state). */
		function getToolbarVisible() {
			return loadToolbarUi().visible;
		}
		/** Lazily mount and return the singleton picker controller. */
		function getPicker() {
			if (pickerController === null) pickerController = mountPicker();
			return pickerController;
		}
		//#endregion
		//#region src/client/image.ts
		/** Image compression for uploaded backgrounds (canvas → data URL). */
		const MAX_DIMENSION = 1920;
		const QUALITY = .85;
		function loadImage(url) {
			return new Promise((resolve, reject) => {
				const image = new Image();
				image.onload = () => resolve(image);
				image.onerror = () => reject(/* @__PURE__ */ new Error("failed to decode image"));
				image.src = url;
			});
		}
		/**
		* Downscale a picked image file to a WebP/JPEG data URL.
		* @param file - the user-picked image file.
		* @returns a compressed data URL usable as a CSS background.
		*/
		async function compressImage(file) {
			const objectUrl = URL.createObjectURL(file);
			try {
				const image = await loadImage(objectUrl);
				const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
				const width = Math.max(1, Math.round(image.naturalWidth * scale));
				const height = Math.max(1, Math.round(image.naturalHeight * scale));
				const canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = height;
				const context = canvas.getContext("2d");
				if (context === null) throw new Error("canvas unavailable");
				context.drawImage(image, 0, 0, width, height);
				try {
					return canvas.toDataURL("image/webp", QUALITY);
				} catch {
					return canvas.toDataURL("image/jpeg", QUALITY);
				}
			} finally {
				URL.revokeObjectURL(objectUrl);
			}
		}
		/** Read a text file (scheme import). */
		function readTextFile(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(String(reader.result ?? ""));
				reader.onerror = () => reject(/* @__PURE__ */ new Error("failed to read file"));
				reader.readAsText(file);
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/studio.module.css.mjs
		const css = ".gV6jKq_root{border-bottom:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:4px;padding:16px 0;display:flex}.gV6jKq_title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}.gV6jKq_block{flex-direction:column;gap:8px;padding:8px 0 0;display:flex}.gV6jKq_blockTitle{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:20px}.gV6jKq_muted{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.gV6jKq_row{color:var(--dsw-alias-label-secondary);align-items:center;gap:10px;font-size:13px;line-height:20px;display:flex}.gV6jKq_sliderRow{color:var(--dsw-alias-label-secondary);align-items:center;gap:10px;font-size:12px;line-height:18px;display:flex}.gV6jKq_sliderRow input[type=range]{flex:1}.gV6jKq_preview{object-fit:cover;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;width:96px;height:54px;display:block}.gV6jKq_layerCard{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:10px;flex-direction:column;gap:6px;padding:8px;display:flex}.gV6jKq_layerHead{align-items:center;gap:8px;display:flex}.gV6jKq_layerThumb{object-fit:cover;border:1px solid var(--dsw-alias-border-l2);border-radius:5px;flex:none;width:40px;height:24px}.gV6jKq_layerTitle{min-width:0;color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:13px;line-height:18px;overflow:hidden}.gV6jKq_select{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);min-width:0;color:var(--dsw-alias-label-primary);font:400 12px/1.4 var(--dsw-font-family,system-ui, sans-serif);border-radius:6px;flex:1;padding:3px 6px}.gV6jKq_button{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:500 12px/1.4 var(--dsw-font-family,system-ui, sans-serif);cursor:pointer;border-radius:8px;padding:5px 12px}.gV6jKq_button:hover{background:var(--dsw-alias-interactive-bg-hover)}.gV6jKq_buttonPrimary{color:#fff;background:linear-gradient(135deg,#6366f1,#a855f7);border-color:#0000;}.gV6jKq_buttonDanger{color:var(--dsw-alias-state-error-primary);}.gV6jKq_buttonGhost{color:var(--dsw-alias-label-tertiary);font:500 12px/1.4 var(--dsw-font-family,system-ui, sans-serif);cursor:pointer;background:0 0;border:0;border-radius:6px;padding:2px 8px}.gV6jKq_buttonGhost:hover{background:var(--dsw-alias-interactive-bg-hover)}.gV6jKq_group{border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);border-radius:8px;padding:6px 8px;font-size:13px;line-height:20px}.gV6jKq_group summary{cursor:pointer;user-select:none}.gV6jKq_tokenRow{border-top:1px solid var(--dsw-alias-border-l1);justify-content:space-between;align-items:center;gap:8px;padding:5px 0;display:flex}.gV6jKq_tokenInfo{flex-direction:column;min-width:0;display:flex}.gV6jKq_tokenLabel{color:var(--dsw-alias-label-primary);font-size:13px;line-height:18px}.gV6jKq_tokenVar{color:var(--dsw-alias-label-tertiary);font:400 11px/1.5 var(--ds-font-family-code,monospace);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.gV6jKq_colorCells{flex:none;gap:6px;display:flex}.gV6jKq_colorCell{cursor:pointer;align-items:center;gap:4px;display:flex}.gV6jKq_colorCell input[type=color]{border:1px solid var(--dsw-alias-border-l2);background:0 0;border-radius:5px;width:26px;height:20px;padding:0}.gV6jKq_colorCode{color:var(--dsw-alias-label-tertiary);font:400 10px/1 var(--ds-font-family-code,monospace);width:44px}.gV6jKq_cssEditor{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-markdown-code-block,var(--dsw-alias-bg-layer-1));width:100%;min-height:96px;color:var(--dsw-alias-label-primary);font:400 12px/1.6 var(--ds-font-family-code,monospace);resize:vertical;border-radius:8px;padding:8px 10px}";
		const tagId = "@dsh-external/dsh-client-ui-skin-studio/studio.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-external/dsh-client-ui-skin-studio";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var studio_module_css_default = {
			"block": "gV6jKq_block",
			"blockTitle": "gV6jKq_blockTitle",
			"button": "gV6jKq_button",
			"buttonDanger": "gV6jKq_buttonDanger",
			"buttonGhost": "gV6jKq_buttonGhost",
			"buttonPrimary": "gV6jKq_buttonPrimary",
			"colorCell": "gV6jKq_colorCell",
			"colorCells": "gV6jKq_colorCells",
			"colorCode": "gV6jKq_colorCode",
			"cssEditor": "gV6jKq_cssEditor",
			"group": "gV6jKq_group",
			"layerCard": "gV6jKq_layerCard",
			"layerHead": "gV6jKq_layerHead",
			"layerThumb": "gV6jKq_layerThumb",
			"layerTitle": "gV6jKq_layerTitle",
			"muted": "gV6jKq_muted",
			"preview": "gV6jKq_preview",
			"root": "gV6jKq_root",
			"row": "gV6jKq_row",
			"select": "gV6jKq_select",
			"sliderRow": "gV6jKq_sliderRow",
			"title": "gV6jKq_title",
			"tokenInfo": "gV6jKq_tokenInfo",
			"tokenLabel": "gV6jKq_tokenLabel",
			"tokenRow": "gV6jKq_tokenRow",
			"tokenVar": "gV6jKq_tokenVar"
		};
		//#endregion
		//#region src/client/settings-row.tsx
		/** Settings row: the skin studio surface inside the General section. */
		/** Read a live CSS variable value (built-in defaults or current overrides). */
		function liveTokenValue(variable) {
			return getComputedStyle(document.body).getPropertyValue(variable).trim();
		}
		function tokenColorInput(variable, mode, pair, onChange) {
			const live = pair?.[mode] ?? liveTokenValue(variable);
			const hex = toHex(live) ?? "#000000";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: studio_module_css_default.colorCell,
				title: `${mode}: ${live}`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "color",
					value: hex,
					onChange: (event) => onChange(event.target.value)
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: studio_module_css_default.colorCode,
					children: hex
				})]
			});
		}
		function BackgroundSection({ scheme }) {
			const imageRef = (0, react.useRef)(null);
			const { background } = scheme;
			const updateBackground = (patch) => {
				store.update((current) => ({ background: {
					...current.background,
					...patch
				} }));
			};
			const updateLayer = (id, patch) => {
				store.update((current) => ({ background: {
					...current.background,
					layers: current.background.layers.map((layer) => layer.id === id ? {
						...layer,
						...patch
					} : layer)
				} }));
			};
			const addImageLayer = async (file) => {
				if (file === void 0) return;
				try {
					const image = await compressImage(file);
					store.update((current) => ({ background: {
						...current.background,
						enabled: true,
						layers: [{
							...createLayer("image"),
							image
						}, ...current.background.layers]
					} }));
				} catch (error) {
					alert(`图片处理失败：${error instanceof Error ? error.message : String(error)}`);
				}
			};
			const addColorLayer = () => {
				store.update((current) => ({ background: {
					...current.background,
					enabled: true,
					layers: [createLayer("color"), ...current.background.layers]
				} }));
			};
			const removeLayer = (id) => {
				store.update((current) => ({ background: {
					...current.background,
					layers: current.background.layers.filter((layer) => layer.id !== id)
				} }));
			};
			const moveLayer = (index, delta) => {
				store.update((current) => {
					const layers = [...current.background.layers];
					const target = index + delta;
					if (target < 0 || target >= layers.length) return {};
					const [item] = layers.splice(index, 1);
					layers.splice(target, 0, item);
					return { background: {
						...current.background,
						layers
					} };
				});
			};
			/** Recreate the old dist-injected wallpaper look as a three-layer stack. */
			const applyWallpaperPreset = () => {
				store.update((current) => {
					const first = current.background.layers[0];
					if (first === void 0 || first.kind !== "image" || first.image === "") return {};
					const fill = {
						...createLayer("image"),
						image: first.image,
						size: "cover"
					};
					const band = {
						...createLayer("image"),
						image: first.image,
						size: "cover",
						blur: 22,
						feather: 260,
						opacity: 100
					};
					const image = {
						...createLayer("image"),
						image: first.image,
						size: "contain",
						feather: 150,
						opacity: 100
					};
					return { background: {
						...current.background,
						enabled: true,
						layers: [
							image,
							band,
							fill
						]
					} };
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.block,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.blockTitle,
						children: ["背景图层 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: studio_module_css_default.muted,
							children: "（顶层在最上，支持模糊/透明/羽化）"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: studio_module_css_default.row,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: background.enabled,
							onChange: (event) => updateBackground({ enabled: event.target.checked })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "启用背景（表面自动半透明，图层透出）" })]
					}),
					background.layers.map((layer, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.layerCard,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: studio_module_css_default.layerHead,
								children: [
									layer.kind === "image" && layer.image !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
										className: studio_module_css_default.layerThumb,
										src: layer.image,
										alt: ""
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: studio_module_css_default.layerThumb,
										style: { background: layer.kind === "color" ? layer.color : "#888" }
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: studio_module_css_default.layerTitle,
										children: layer.kind === "image" ? `图片图层 ${index + 1}` : `颜色图层 ${index + 1}`
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										title: "显示/隐藏",
										checked: layer.visible,
										onChange: (event) => updateLayer(layer.id, { visible: event.target.checked })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: studio_module_css_default.buttonGhost,
										title: "上移",
										disabled: index === 0,
										onClick: () => moveLayer(index, -1),
										children: "↑"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: studio_module_css_default.buttonGhost,
										title: "下移",
										disabled: index === background.layers.length - 1,
										onClick: () => moveLayer(index, 1),
										children: "↓"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: studio_module_css_default.buttonGhost,
										title: "删除",
										onClick: () => removeLayer(layer.id),
										children: "✕"
									})
								]
							}),
							layer.kind === "image" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: studio_module_css_default.sliderRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "尺寸" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: studio_module_css_default.select,
									value: layer.size,
									onChange: (event) => updateLayer(layer.id, { size: event.target.value }),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "cover",
											children: "铺满（裁剪）"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "contain",
											children: "完整显示（留边）"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "stretch",
											children: "拉伸"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "custom",
											children: "自定义缩放"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "repeat",
											children: "平铺"
										})
									]
								})]
							}),
							layer.kind === "image" && layer.size === "custom" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: studio_module_css_default.sliderRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									"缩放：",
									layer.scale,
									"%"
								] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "range",
									min: 10,
									max: 300,
									value: layer.scale,
									onChange: (event) => updateLayer(layer.id, { scale: Number(event.target.value) })
								})]
							}),
							layer.kind === "image" && layer.size !== "stretch" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: studio_module_css_default.sliderRow,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "位置预设" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										className: studio_module_css_default.select,
										value: layer.position,
										onChange: (event) => {
											const position = event.target.value;
											const { posX, posY } = positionToXY(position);
											updateLayer(layer.id, {
												position,
												posX,
												posY
											});
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "center",
												children: "居中"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "left center",
												children: "靠左"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "right center",
												children: "靠右"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "center top",
												children: "靠上"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "center bottom",
												children: "靠下"
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: studio_module_css_default.sliderRow,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										"左右移动：",
										layer.posX,
										"%"
									] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "range",
										min: 0,
										max: 100,
										value: layer.posX,
										onChange: (event) => {
											const posX = Number(event.target.value);
											updateLayer(layer.id, {
												posX,
												position: `${posX}% ${layer.posY}%`
											});
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: studio_module_css_default.sliderRow,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										"上下移动：",
										layer.posY,
										"%"
									] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "range",
										min: 0,
										max: 100,
										value: layer.posY,
										onChange: (event) => {
											const posY = Number(event.target.value);
											updateLayer(layer.id, {
												posY,
												position: `${layer.posX}% ${posY}%`
											});
										}
									})]
								})
							] }),
							layer.kind === "color" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: studio_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "颜色" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "color",
									value: toHex(layer.color) ?? "#000000",
									onChange: (event) => {
										const rgb = fromHex(event.target.value);
										if (rgb !== null) updateLayer(layer.id, { color: rgb });
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: studio_module_css_default.sliderRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									"模糊：",
									layer.blur,
									"px"
								] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "range",
									min: 0,
									max: 60,
									value: layer.blur,
									onChange: (event) => updateLayer(layer.id, { blur: Number(event.target.value) })
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: studio_module_css_default.sliderRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									"透明度：",
									layer.opacity,
									"%"
								] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "range",
									min: 0,
									max: 100,
									value: layer.opacity,
									onChange: (event) => updateLayer(layer.id, { opacity: Number(event.target.value) })
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: studio_module_css_default.sliderRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									"边缘羽化：",
									layer.feather,
									"px"
								] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "range",
									min: 0,
									max: 200,
									value: layer.feather,
									onChange: (event) => updateLayer(layer.id, { feather: Number(event.target.value) })
								})]
							})
						]
					}, layer.id)),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.row,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: studio_module_css_default.button,
								onClick: () => imageRef.current?.click(),
								children: "＋ 添加图片层"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								ref: imageRef,
								type: "file",
								accept: "image/*",
								style: { display: "none" },
								onChange: (event) => {
									addImageLayer(event.target.files?.[0]);
									event.target.value = "";
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: studio_module_css_default.button,
								onClick: addColorLayer,
								children: "＋ 添加颜色层"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: studio_module_css_default.button,
								title: "复刻旧版壁纸效果：清晰完整图 + 模糊带 + 铺满底层",
								onClick: applyWallpaperPreset,
								children: "壁纸三层预设"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: studio_module_css_default.sliderRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
							"全局压暗：",
							Math.round(background.overlay * 100),
							"%"
						] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "range",
							min: 0,
							max: 90,
							value: Math.round(background.overlay * 100),
							onChange: (event) => updateBackground({ overlay: Number(event.target.value) / 100 })
						})]
					})
				]
			});
		}
		function TokenSection({ scheme }) {
			const grouped = TOKEN_GROUPS;
			const entries = TOKEN_DIRECTORY;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.block,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: studio_module_css_default.blockTitle,
					children: ["主题 Token ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: studio_module_css_default.muted,
						children: "（亮/暗两套，实时生效）"
					})]
				}), Object.entries(grouped).map(([group, label]) => {
					const items = entries.filter((entry) => entry.group === group);
					if (items.length === 0) return null;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
						className: studio_module_css_default.group,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", { children: [label, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: studio_module_css_default.muted,
							children: [" ", items.filter((entry) => scheme.tokens[entry.variable]).length ? `· ${items.filter((entry) => scheme.tokens[entry.variable]).length} 已改` : ""]
						})] }), items.map((entry) => {
							const pair = scheme.tokens[entry.variable];
							const setColor = (mode) => (hex) => {
								const next = fromHex(hex);
								if (next === null) return;
								const base = pair ?? {
									light: liveTokenValue(entry.variable),
									dark: liveTokenValue(entry.variable)
								};
								store.update((current) => ({ tokens: {
									...current.tokens,
									[entry.variable]: {
										...base,
										[mode]: next
									}
								} }));
							};
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: studio_module_css_default.tokenRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: studio_module_css_default.tokenInfo,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: studio_module_css_default.tokenLabel,
											children: entry.label
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
											className: studio_module_css_default.tokenVar,
											children: entry.variable
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: studio_module_css_default.colorCells,
										children: [tokenColorInput(entry.variable, "light", pair, setColor("light")), tokenColorInput(entry.variable, "dark", pair, setColor("dark"))]
									}),
									pair !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: studio_module_css_default.buttonGhost,
										onClick: () => store.update((current) => {
											const tokens = { ...current.tokens };
											delete tokens[entry.variable];
											return { tokens };
										}),
										children: "重置"
									})
								]
							}, entry.variable);
						})]
					}, group);
				})]
			});
		}
		function CssSection({ scheme }) {
			const timer = (0, react.useRef)(null);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.block,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.blockTitle,
						children: ["原始 CSS ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: studio_module_css_default.muted,
							children: "（注入到页面末尾，优先级最高）"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
						className: studio_module_css_default.cssEditor,
						spellCheck: false,
						value: scheme.css,
						placeholder: "/* 例：改对话区导航栏 */\n[data-pane=\"conversation\"] header {\n  background: rgba(0, 0, 0, 0.4) !important;\n  backdrop-filter: blur(12px);\n}",
						onChange: (event) => {
							const next = event.target.value;
							if (timer.current !== null) clearTimeout(timer.current);
							timer.current = setTimeout(() => {
								store.update({ css: next });
							}, 400);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.muted,
						children: [
							"可用稳定钩子：",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: "[data-pane=\"sidebar\"]" }),
							"、",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: "[data-pane=\"conversation\"]" }),
							"、",
							" ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: "[data-composer-seat]" }),
							"、",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: "[data-chat-flow]" }),
							"、",
							" ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: "[data-composer-card]" }),
							"；暗色模式用",
							" ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: "body[data-ds-dark-theme]" }),
							" 前缀。"
						]
					})
				]
			});
		}
		function SchemeSection() {
			const importRef = (0, react.useRef)(null);
			const exportScheme = () => {
				const blob = new Blob([JSON.stringify(store.get(), null, 2)], { type: "application/json" });
				const url = URL.createObjectURL(blob);
				const anchor = document.createElement("a");
				anchor.href = url;
				anchor.download = "dsh-skin-studio-scheme.json";
				anchor.click();
				window.setTimeout(() => URL.revokeObjectURL(url), 2e3);
			};
			const importScheme = async (file) => {
				if (file === void 0) return;
				try {
					const parsed = JSON.parse(await readTextFile(file));
					if (typeof parsed !== "object" || parsed === null) throw new Error("不是有效的方案文件");
					store.replace(parsed);
					alert("方案已导入");
				} catch (error) {
					alert(`导入失败：${error instanceof Error ? error.message : String(error)}`);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.block,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: studio_module_css_default.blockTitle,
						children: "方案"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.row,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: studio_module_css_default.button,
								onClick: exportScheme,
								children: "导出方案"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: studio_module_css_default.button,
								onClick: () => importRef.current?.click(),
								children: "导入方案"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								ref: importRef,
								type: "file",
								accept: "application/json,.json",
								style: { display: "none" },
								onChange: (event) => {
									importScheme(event.target.files?.[0]);
									event.target.value = "";
								}
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: studio_module_css_default.row,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: studio_module_css_default.buttonDanger,
							onClick: () => {
								if (window.confirm("恢复默认会清空全部自定义，确定？")) store.reset();
							},
							children: "恢复默认"
						})
					})
				]
			});
		}
		function SkinStudioRow() {
			const scheme = (0, react.useSyncExternalStore)(store.subscribe, store.get);
			const [toolbarVisible, setToolbarVisibleState] = (0, react.useState)(getToolbarVisible);
			const setToolbarVisible = (visible) => {
				getPicker().setVisible(visible);
				setToolbarVisibleState(visible);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.root,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: studio_module_css_default.title,
						children: "主题定制"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BackgroundSection, { scheme }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TokenSection, { scheme }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CssSection, { scheme }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.block,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: studio_module_css_default.blockTitle,
								children: ["元素拾取器 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: studio_module_css_default.muted,
									children: "（点哪个改哪个）"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: studio_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: toolbarVisible,
									onChange: (event) => {
										setToolbarVisible(event.target.checked);
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "显示拾取/涂色工具栏（可拖动，位置自动记忆）" })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: studio_module_css_default.row,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: studio_module_css_default.buttonPrimary,
									onClick: () => getPicker().toggle(),
									children: "🎨 拾取元素"
								})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SchemeSection, {})
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Services the guard facade exposes to this plugin's apply(). */
		const inject = ["slots", "theme"];
		/**
		* Apply the skin studio: bind the scheme to the theme service, register the
		* General-section settings row, and mount the element picker. Every owned DOM
		* write and the override layer are retracted by the effect disposer.
		* @param ctx - client cordis context with slots and theme services.
		*/
		function apply(ctx) {
			const applyHandle = bindApply(ctx.theme);
			const picker = getPicker();
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "skin-studio",
				order: 20
			}, SkinStudioRow));
			ctx.effect(() => () => {
				applyHandle.dispose();
				picker.dispose();
			}, "ui-skin-studio: scheme binding, settings row, and picker");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map