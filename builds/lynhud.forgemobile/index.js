var plugin = (() => {
    "use strict";

    const h = React.createElement;
    const {
        Image,
        Pressable,
        ScrollView,
        Switch,
        Text,
        TextInput,
        View,
        useWindowDimensions
    } = ReactNative;

    const storage = bunny.plugin.createStorage();
    const useObservable = bunny.api.storage.useObservable;
    const patcher = bunny.api.patcher;
    const findByStoreNameLazy = bunny.metro.findByStoreNameLazy;
    const findByPropsLazy = bunny.metro.findByPropsLazy;
    const findAssetId = bunny.api.assets.findAssetId;
    const showToast = bunny.ui.toasts.showToast;
    const UserStore = findByStoreNameLazy("UserStore");

    const ICONS = Object.freeze([
        { id: "smile", name: "Smile", glyph: "☺", assets: ["SmileIcon", "EmojiIcon"] },
        { id: "heart", name: "Heart", glyph: "♥", assets: ["HeartIcon", "FavoriteIcon"] },
        { id: "target", name: "Target", glyph: "◎", assets: ["TargetIcon", "FocusIcon"] },
        { id: "brush", name: "Brush", glyph: "✎", assets: ["PaintbrushIcon", "BrushIcon", "PencilIcon"] },
        { id: "code", name: "Code", glyph: "‹›", assets: ["CodeIcon", "ApplicationCommandIcon"] },
        { id: "game", name: "Game", glyph: "◆", assets: ["GameControllerIcon", "ActivitiesIcon"] },
        { id: "music", name: "Music", glyph: "♫", assets: ["MusicIcon", "SoundIcon"] },
        { id: "star", name: "Star", glyph: "★", assets: ["StarIcon", "FavoriteIcon"] },
        { id: "spark", name: "Spark", glyph: "✦", assets: ["SparkleIcon", "MagicWandIcon"] },
        { id: "bolt", name: "Bolt", glyph: "ϟ", assets: ["LightningIcon", "FlashIcon"] },
        { id: "moon", name: "Moon", glyph: "☾", assets: ["MoonIcon", "SleepIcon"] },
        { id: "cloud", name: "Cloud", glyph: "☁", assets: ["CloudIcon"] },
        { id: "gear", name: "Gear", glyph: "⚙", assets: ["SettingsIcon", "GearIcon"] },
        { id: "check", name: "Check", glyph: "✓", assets: ["CheckmarkLargeIcon", "CheckIcon"] }
    ]);

    const PRESETS = Object.freeze([
        { name: "Deep Focus", color: "#8a2be2", secondaryColor: "#00e5ff", icon: "target", gradient: true },
        { name: "Shader Hell", color: "#ff3300", secondaryColor: "#ffb000", icon: "code", gradient: true },
        { name: "FC Chasing", color: "#ff00aa", secondaryColor: "#ffd166", icon: "star", gradient: true },
        { name: "Hyperfixating", color: "#ff4500", secondaryColor: "#a855f7", icon: "bolt", gradient: true },
        { name: "Vibing", color: "#ffb3c6", secondaryColor: "#8b5cf6", icon: "music", gradient: true },
        { name: "Compiling...", color: "#00e5ff", secondaryColor: "#ff00aa", icon: "code", gradient: true },
        { name: "Debugging Psych", color: "#32cd32", secondaryColor: "#00e5ff", icon: "gear", gradient: true },
        { name: "Spriting in IbisPaint", color: "#ff69b4", secondaryColor: "#ffb6c1", icon: "brush", gradient: true },
        { name: "Axolyn Mode", color: "#ff7f50", secondaryColor: "#67e8f9", icon: "smile", gradient: true },
        { name: "Buried in Plushies", color: "#ffb6c1", secondaryColor: "#a78bfa", icon: "heart", gradient: true },
        { name: "Rainy Nap", color: "#8ea1ff", secondaryColor: "#c7d2fe", icon: "moon", gradient: true },
        { name: "System Online", color: "#32cd32", secondaryColor: "#00e5ff", icon: "check", gradient: true }
    ]);

    const PALETTE = Object.freeze([
        "#ff69b4", "#ffb6c1", "#ff7f50", "#ff3300", "#ffb000", "#32cd32",
        "#00e5ff", "#67e8f9", "#8ea1ff", "#5865f2", "#8a2be2", "#a855f7"
    ]);

    const DEFAULT_STATUS = Object.freeze({
        name: "Forged Status",
        color: "#ff69b4",
        secondaryColor: "#00e5ff",
        icon: "brush",
        gradient: true
    });

    const assetCache = new Map();
    const pluginElement = Symbol("forge-mobile-element");

    function safeColor(value, fallback) {
        return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value).toLowerCase() : fallback;
    }

    function safeName(value, fallback) {
        const clean = String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, 32);
        return clean || fallback;
    }

    function safeIcon(value) {
        return ICONS.some(icon => icon.id === value) ? value : "brush";
    }

    function normalizeStatus(value) {
        const source = value && typeof value === "object" ? value : DEFAULT_STATUS;
        return {
            name: safeName(source.name, DEFAULT_STATUS.name),
            color: safeColor(source.color, DEFAULT_STATUS.color),
            secondaryColor: safeColor(source.secondaryColor, DEFAULT_STATUS.secondaryColor),
            icon: safeIcon(source.icon),
            gradient: source.gradient !== false
        };
    }

    function initializeStorage() {
        storage.enabled ??= true;
        storage.active ??= { ...DEFAULT_STATUS };
        storage.draft ??= { ...normalizeStatus(storage.active) };
        storage.saved ??= [];
        storage.replaceLocalStatusText ??= true;
        storage.hideNativeBadge ??= true;
        storage.transferText ??= "";
    }

    function currentUser() {
        try {
            return UserStore.getCurrentUser?.() || null;
        } catch {
            return null;
        }
    }

    function iconDefinition(iconId) {
        return ICONS.find(icon => icon.id === safeIcon(iconId)) || ICONS[3];
    }

    function resolveIconAsset(iconId) {
        if (assetCache.has(iconId)) return assetCache.get(iconId);
        const definition = iconDefinition(iconId);
        let source;
        for (const name of definition.assets) {
            try {
                source = findAssetId(name);
                if (source) break;
            } catch { /* Discord asset names can change. */ }
        }
        assetCache.set(iconId, source || null);
        return source || null;
    }

    function ForgeIcon({ status, size, selected }) {
        const clean = normalizeStatus(status);
        const source = resolveIconAsset(clean.icon);
        const definition = iconDefinition(clean.icon);
        const primary = clean.color;
        const secondary = clean.secondaryColor;
        const layerSize = Math.max(8, Math.round(size * .78));
        const common = {
            position: "absolute",
            width: layerSize,
            height: layerSize,
            left: Math.round((size - layerSize) / 2),
            top: Math.round((size - layerSize) / 2)
        };

        const layers = [];
        if (clean.gradient) {
            if (source) {
                layers.push(h(Image, {
                    key: "secondary",
                    source,
                    resizeMode: "contain",
                    style: [common, { tintColor: secondary, opacity: .88, transform: [{ translateX: 1.4 }, { translateY: -1.2 }] }]
                }));
            } else {
                layers.push(h(Text, {
                    key: "secondary",
                    style: {
                        position: "absolute",
                        width: size,
                        height: size,
                        color: secondary,
                        fontSize: Math.round(size * .76),
                        fontWeight: "900",
                        lineHeight: size,
                        textAlign: "center",
                        transform: [{ translateX: 1.2 }, { translateY: -1 }]
                    }
                }, definition.glyph));
            }
        }

        if (source) {
            layers.push(h(Image, { key: "primary", source, resizeMode: "contain", style: [common, { tintColor: primary }] }));
        } else {
            layers.push(h(Text, {
                key: "primary",
                style: {
                    position: "absolute",
                    width: size,
                    height: size,
                    color: primary,
                    fontSize: Math.round(size * .76),
                    fontWeight: "900",
                    lineHeight: size,
                    textAlign: "center",
                    textShadowColor: selected ? secondary : "transparent",
                    textShadowRadius: selected ? 5 : 0
                }
            }, definition.glyph));
        }

        return h(View, {
            [pluginElement]: true,
            pointerEvents: "none",
            style: { width: size, height: size, position: "relative" }
        }, layers);
    }

    function statusFromStorage() {
        return normalizeStatus(storage.active);
    }

    function ownerIdFromAvatarProps(props) {
        const userId = props?.user?.id || props?.userId || props?.user_id || props?.profile?.user?.id;
        if (userId) return String(userId);
        const source = props?.source;
        const uri = source?.uri || source?.[0]?.uri || props?.avatarSource?.uri || "";
        const ownId = currentUser()?.id;
        return ownId && String(uri).includes(`/avatars/${ownId}/`) ? String(ownId) : null;
    }

    function numericAvatarSize(props) {
        if (Number.isFinite(props?.size)) return Number(props.size);
        const fromName = String(props?.size || "").match(/\d+/)?.[0];
        if (fromName) return Number(fromName);
        try {
            const flat = ReactNative.StyleSheet.flatten(props?.style) || {};
            if (Number.isFinite(flat.width)) return Number(flat.width);
        } catch { /* Use compact fallback. */ }
        return 32;
    }

    function patchOwnAvatars() {
        const jsxRuntime = findByPropsLazy("jsx", "jsxs");
        const callback = (args, result) => {
            if (!storage.enabled || !result || !args?.[1] || args[1][pluginElement]) return;
            const Component = args[0];
            const props = args[1];
            const componentName = String(Component?.displayName || Component?.name || "");
            const looksLikeAvatar = /avatar/i.test(componentName) || (props.source && ("status" in props || "showStatus" in props));
            if (!looksLikeAvatar) return;

            const ownId = currentUser()?.id;
            if (!ownId || ownerIdFromAvatarProps(props) !== String(ownId)) return;
            if (!("status" in props) && props.showStatus !== true && props.statusVisible !== true) return;

            const avatarSize = numericAvatarSize(props);
            const iconSize = avatarSize >= 64 ? 24 : avatarSize >= 44 ? 15 : 10;
            const cleanAvatar = storage.hideNativeBadge
                ? React.cloneElement(result, {
                    status: null,
                    statusColor: "transparent",
                    showStatus: false,
                    statusVisible: false
                })
                : result;

            return h(View, {
                [pluginElement]: true,
                style: { position: "relative", width: avatarSize, height: avatarSize }
            }, cleanAvatar, h(View, {
                pointerEvents: "none",
                style: {
                    position: "absolute",
                    right: avatarSize >= 64 ? -1 : 0,
                    bottom: avatarSize >= 64 ? 0 : -1,
                    width: iconSize,
                    height: iconSize,
                    zIndex: 999
                }
            }, h(ForgeIcon, { status: statusFromStorage(), size: iconSize })));
        };

        patcher.after("jsx", jsxRuntime, callback);
        patcher.after("jsxs", jsxRuntime, callback);
    }

    function patchLocalStatusText() {
        const PresenceStore = findByStoreNameLazy("PresenceStore");
        patcher.after("getActivities", PresenceStore, (args, activities) => {
            if (!storage.enabled || !storage.replaceLocalStatusText || !Array.isArray(activities)) return;
            const ownId = currentUser()?.id;
            const requestedUserId = args?.[0]?.id || args?.[0];
            if (!ownId || String(requestedUserId || "") !== String(ownId)) return;
            const status = statusFromStorage();
            const withoutCustomStatus = activities.filter(activity => activity?.type !== 4);
            return [...withoutCustomStatus, {
                id: "forge-mobile-local-status",
                name: "Custom Status",
                type: 4,
                state: status.name,
                created_at: Date.now(),
                timestamps: { start: Date.now() }
            }];
        });
    }

    function toast(message) {
        try { showToast(message, resolveIconAsset(storage.active?.icon)); } catch { /* Toast API can vary. */ }
    }

    function applyStatus(status) {
        storage.active = normalizeStatus(status);
        storage.draft = { ...storage.active };
        toast(`Forge engaged: ${storage.active.name}`);
    }

    const styles = {
        screen: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 40, gap: 12 },
        section: { borderRadius: 14, backgroundColor: "#1e1f22", padding: 12, gap: 10 },
        heading: { color: "#ffffff", fontSize: 17, fontWeight: "800" },
        subheading: { color: "#b5bac1", fontSize: 12, lineHeight: 17 },
        label: { color: "#dbdee1", fontSize: 13, fontWeight: "700" },
        input: { minHeight: 44, borderRadius: 9, paddingHorizontal: 11, color: "#ffffff", backgroundColor: "#111214", borderWidth: 1, borderColor: "#3f4147" },
        row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
        wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
        button: { minHeight: 42, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, backgroundColor: "#5865f2" },
        buttonText: { color: "#ffffff", fontWeight: "800", fontSize: 13 },
        secondaryButton: { minHeight: 40, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, backgroundColor: "#2b2d31", borderWidth: 1, borderColor: "#3f4147" },
        secondaryButtonText: { color: "#dbdee1", fontWeight: "700", fontSize: 12 }
    };

    function ToggleRow({ label, value, onChange }) {
        return h(View, { style: styles.row },
            h(Text, { style: styles.label }, label),
            h(Switch, { value, onValueChange: onChange, trackColor: { false: "#4e5058", true: "#5865f2" } })
        );
    }

    function PresetCard({ preset, wide }) {
        return h(Pressable, {
            onPress: () => applyStatus(preset),
            style: {
                width: wide ? "48.7%" : "100%",
                minHeight: 64,
                borderRadius: 11,
                padding: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: "#2b2d31",
                borderLeftWidth: 3,
                borderLeftColor: preset.color
            }
        },
        h(ForgeIcon, { status: preset, size: 30 }),
        h(View, { style: { flex: 1 } },
            h(Text, { numberOfLines: 1, style: { color: "#ffffff", fontSize: 13, fontWeight: "800" } }, preset.name),
            h(Text, { style: { color: "#949ba4", fontSize: 10, marginTop: 2 } }, `${iconDefinition(preset.icon).name} · tap to engage`)
        ));
    }

    function ForgeSettings() {
        useObservable([storage]);
        const { width } = useWindowDimensions();
        const wide = width >= 600;
        const draft = normalizeStatus(storage.draft);
        const active = normalizeStatus(storage.active);
        const saved = Array.isArray(storage.saved) ? storage.saved : [];

        const updateDraft = patch => { storage.draft = normalizeStatus({ ...draft, ...patch }); };
        const saveDraft = () => {
            const creation = { ...draft, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
            storage.saved = [creation, ...saved].slice(0, 30);
            toast(`Saved ${creation.name}`);
        };
        const exportData = () => {
            const text = JSON.stringify({ version: 1, active, saved }, null, 2);
            storage.transferText = text;
            try { bunny.metro.common.clipboard.setString(text); } catch { /* Text remains in the transfer box. */ }
            toast("Forge backup copied");
        };
        const importData = () => {
            try {
                const parsed = JSON.parse(storage.transferText || "");
                if (!parsed || typeof parsed !== "object") throw new Error("Invalid backup");
                storage.active = normalizeStatus(parsed.active);
                storage.draft = { ...storage.active };
                storage.saved = Array.isArray(parsed.saved) ? parsed.saved.slice(0, 30).map(normalizeStatus) : [];
                toast("Forge backup imported");
            } catch {
                toast("That backup could not be read");
            }
        };

        return h(ScrollView, { contentContainerStyle: styles.screen, keyboardShouldPersistTaps: "handled" },
            h(View, { style: [styles.section, { borderWidth: 1.5, borderColor: active.color, shadowColor: active.secondaryColor, shadowOpacity: .65, shadowRadius: 12 }] },
                h(View, { style: { flexDirection: "row", alignItems: "center", gap: 13 } },
                    h(ForgeIcon, { status: active, size: wide ? 54 : 46, selected: true }),
                    h(View, { style: { flex: 1 } },
                        h(Text, { style: styles.heading }, active.name),
                        h(Text, { style: [styles.subheading, { color: active.color }] }, `Active locally · ${iconDefinition(active.icon).name}`)
                    ),
                    h(Switch, { value: storage.enabled, onValueChange: value => storage.enabled = value, trackColor: { false: "#4e5058", true: active.color } })
                ),
                h(Text, { style: styles.subheading }, "Forge Mobile changes only what you see in this modified Discord installation.")
            ),

            h(View, { style: styles.section },
                h(Text, { style: styles.heading }, "Build a status"),
                h(TextInput, {
                    value: draft.name,
                    maxLength: 32,
                    placeholder: "Status name",
                    placeholderTextColor: "#6d6f78",
                    onChangeText: name => updateDraft({ name }),
                    style: styles.input
                }),
                h(Text, { style: styles.label }, "Icon"),
                h(View, { style: styles.wrap }, ICONS.map(icon => h(Pressable, {
                    key: icon.id,
                    onPress: () => updateDraft({ icon: icon.id }),
                    style: {
                        width: wide ? "11.2%" : "14.8%",
                        aspectRatio: 1,
                        minWidth: 42,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: draft.icon === icon.id ? "#3b3f72" : "#111214",
                        borderWidth: 1,
                        borderColor: draft.icon === icon.id ? "#8ea1ff" : "#3f4147"
                    }
                }, h(ForgeIcon, { status: { ...draft, icon: icon.id }, size: wide ? 31 : 27, selected: draft.icon === icon.id })))),
                h(Text, { style: styles.label }, "Primary color"),
                h(View, { style: styles.wrap }, PALETTE.map(color => h(Pressable, {
                    key: color,
                    onPress: () => updateDraft({ color }),
                    style: { width: wide ? 45 : 39, height: wide ? 45 : 39, borderRadius: 50, backgroundColor: color, borderWidth: draft.color === color ? 3 : 1, borderColor: draft.color === color ? "#ffffff" : "#111214" }
                }))),
                h(Text, { style: styles.label }, "Accent color"),
                h(View, { style: styles.wrap }, PALETTE.map(color => h(Pressable, {
                    key: `secondary-${color}`,
                    onPress: () => updateDraft({ secondaryColor: color }),
                    style: { width: wide ? 45 : 39, height: wide ? 45 : 39, borderRadius: 50, backgroundColor: color, borderWidth: draft.secondaryColor === color ? 3 : 1, borderColor: draft.secondaryColor === color ? "#ffffff" : "#111214" }
                }))),
                h(ToggleRow, { label: "Two-color icon", value: draft.gradient, onChange: gradient => updateDraft({ gradient }) }),
                h(View, { style: { flexDirection: "row", gap: 8 } },
                    h(Pressable, { onPress: saveDraft, style: [styles.secondaryButton, { flex: 1 }] }, h(Text, { style: styles.secondaryButtonText }, "Save Creation")),
                    h(Pressable, { onPress: () => applyStatus(draft), style: [styles.button, { flex: 1 }] }, h(Text, { style: styles.buttonText }, "Engage"))
                )
            ),

            h(View, { style: styles.section },
                h(Text, { style: styles.heading }, "Presets"),
                h(View, { style: styles.wrap }, PRESETS.map(preset => h(PresetCard, { key: preset.name, preset, wide })))
            ),

            saved.length ? h(View, { style: styles.section },
                h(Text, { style: styles.heading }, "Saved creations"),
                h(View, { style: styles.wrap }, saved.map((creation, index) => h(Pressable, {
                    key: creation.id || `${creation.name}-${index}`,
                    onPress: () => applyStatus(creation),
                    onLongPress: () => { storage.saved = saved.filter((_, savedIndex) => savedIndex !== index); toast("Saved creation removed"); },
                    style: [styles.secondaryButton, { width: wide ? "48.7%" : "100%", minHeight: 54, flexDirection: "row", justifyContent: "flex-start", gap: 9 }]
                }, h(ForgeIcon, { status: creation, size: 27 }), h(View, { style: { flex: 1 } },
                    h(Text, { numberOfLines: 1, style: { color: "#ffffff", fontWeight: "800" } }, creation.name),
                    h(Text, { style: { color: "#949ba4", fontSize: 10 } }, "Tap to use · hold to remove")
                ))))
            ) : null,

            h(View, { style: styles.section },
                h(Text, { style: styles.heading }, "Compatibility"),
                h(ToggleRow, { label: "Replace local status text", value: storage.replaceLocalStatusText, onChange: value => storage.replaceLocalStatusText = value }),
                h(ToggleRow, { label: "Hide Discord status badge", value: storage.hideNativeBadge, onChange: value => storage.hideNativeBadge = value }),
                h(Text, { style: styles.subheading }, "If a Discord update changes its avatar components, temporarily turn off Hide Discord status badge and report the build number.")
            ),

            h(View, { style: styles.section },
                h(Text, { style: styles.heading }, "Transfer Forge data"),
                h(Text, { style: styles.subheading }, "Export on one device, paste the backup here on another device, then import."),
                h(TextInput, {
                    value: storage.transferText,
                    onChangeText: value => storage.transferText = value,
                    multiline: true,
                    numberOfLines: 5,
                    placeholder: "Forge JSON backup",
                    placeholderTextColor: "#6d6f78",
                    style: [styles.input, { minHeight: 110, textAlignVertical: "top", paddingTop: 10, fontSize: 10 }]
                }),
                h(View, { style: { flexDirection: "row", gap: 8 } },
                    h(Pressable, { onPress: exportData, style: [styles.secondaryButton, { flex: 1 }] }, h(Text, { style: styles.secondaryButtonText }, "Export")),
                    h(Pressable, { onPress: importData, style: [styles.button, { flex: 1 }] }, h(Text, { style: styles.buttonText }, "Import"))
                )
            )
        );
    }

    return definePlugin({
        start() {
            initializeStorage();
            patchOwnAvatars();
            patchLocalStatusText();
            bunny.plugin.logger.info("Forge Mobile 0.1.0 started");
        },
        stop() {
            bunny.plugin.logger.info("Forge Mobile stopped; Revenge will dispose its patches");
        },
        SettingsComponent: ForgeSettings
    });
})();
