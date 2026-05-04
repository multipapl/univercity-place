# Scene Layers Specification

Специфікація всіх шарів сцени для архітектурного viewer'а University Place.
Визначає naming convention, відповідальність 3D-пайплайну (Blender) і коду (Three.js), формат даних, UV-канали, матеріали, а також конкретні файли та патерни для імплементації.

---

## Робочий процес

### Принцип: один шар за раз

Імплементація йде послідовно. Кожен шар проходить повний цикл перед переходом до наступного:

1. **3D-сторона** готує і експортує GLB-файл згідно зі специфікацією шару
2. **Код-сторона** імплементує або оновлює підтримку цього шару
3. **Спільна перевірка** — завантажити в viewer, візуально оцінити, підкрутити параметри
4. **Закрити шар** — зафіксувати що працює, перейти до наступного

Не переходимо до наступного шару, поки поточний не закритий.

### Порядок імплементації

1. `scene.glb` — завантажити оновлений бейк, перевірити
2. `probes.glb` + `reflect.glb` — multi-probe система (фундамент для glass/windows)
3. `glass.glb` — перехід на MeshPhysicalMaterial + probes
4. `windows.glb` — новий шар
5. `translucent.glb` — fake subsurface
6. `bg.glb` — перевірити без змін
7. `sky.glb` — rename
8. `fire.glb` — rename
9. `emissive.glb` — новий шар

---

## 1. `scene.glb` — запечена сцена

**Статус:** працює, змін в коді не потребує.

| | Опис |
|---|---|
| Призначення | Всі запечені об'єкти без додаткового шейдерного допрацювання |
| Material mode | `baked` → `MeshBasicMaterial` (unlit) |
| Текстура | Одна per object — all-in-one bake (колір, бліки, тіні) |
| UV-канали | UV0 — bake |
| Альфа | Ні |
| Рефлекти | Ні |

### Blender (3D)
- Бейк всієї інформації в одну текстуру per object
- Підключення: Base Color, Emission, або Principled BSDF — код приймає всі три варіанти
- Назви mesh/material ідентичні в пайплайні

### Код — без змін
- Asset contract: `src/config/assetsConfig.js` рядок 102–112, id `base`, `materialMode: "baked"`
- Фабрика: `src/materials/factories/makeBakedMaterial.js`
- Читає `map` або `emissiveMap` через `getMaterialTexture()` → `MeshBasicMaterial`

### Відомі обмеження
- Великі об'єкти (підлога) мають низький texel density навіть при 8K — вирішується на стороні 3D (архітектурні розділювачі), не в коді

---

## 2. `probes.glb` — probe-точки для env map рефлектів

**Статус: НОВИЙ asset + НОВА підсистема.** Це фундамент для reflect, glass, windows — імплементується першим.

| | Опис |
|---|---|
| Призначення | Передача позицій і панорам для multi-probe env map системи |
| Використовується в | reflect, glass, windows |
| Замінює | `cubemap.png` (одна спільна env map на всю сцену) |

### Blender (3D)
- Для кожної probe-точки створити plane (або будь-яку просту геометрію, 1 face достатньо) в точці, з якої рендерилась панорама
- **Naming convention:** `probe_kitchen`, `probe_living`, `probe_bedroom` тощо (префікс `probe_` обов'язковий)
- Матеріал: панорама підключена в **Base Color** або **Emission** (код перевіряє обидва через `getMaterialTexture`)
- Панорами: equirectangular, розмір **2048×1024**, JPEG стиснення ок
- Кількість: **2–5** (починати з 2 для тестів, максимум 5)
- Текстури вбудовані в GLB (не окремі файли) — важливо для R2/CDN deployment
- **Увага:** probe-ноди це не видимі об'єкти, вони лише переносять позицію + текстуру

### Код — що створити

**Новий asset contract** в `src/config/assetsConfig.js`:
- Додати в `SCENE_LAYER_CONTRACTS` новий запис з `id: "probes"`, `localPath: "probes.glb"`, `required: false`
- Або створити окремий contract поза масивом шарів (як `FIRE_VIDEO_ASSET_CONTRACT`) — бо probes це не візуальний шар, а допоміжний asset
- probes.glb МУСИТЬ завантажуватись **перед** reflect, glass, windows

**Новий модуль: `src/materials/probeEnvironmentManager.js`** (або розширення `reflectionEnvironment.js`):
- Функція `loadProbesFromGltf(gltfScene, pmremGenerator)`:
  - `gltfScene.traverse()` — знайти всі ноди з `node.name.startsWith("probe_")`
  - Для кожної: витягти `node.position` (world position) + текстуру з `node.children[0].material.map` або `.emissiveMap`
  - Конвертувати текстуру: встановити `texture.mapping = EquirectangularReflectionMapping`, `texture.colorSpace = SRGBColorSpace`, потім `pmremGenerator.fromEquirectangular(texture)` → env map
  - Зберегти масив `[{ name, position: Vector3, envMap: PMREMTexture }]`
  - Dispose вихідні equirect текстури після конвертації
  - Видалити probe-ноди з gltf scene (вони не рендеряться)
- Функція `getClosestProbeEnvMap(meshWorldPosition)`:
  - Порівняти `meshWorldPosition` з позиціями всіх probes
  - Повернути env map найближчої probe
  - Використовує `Vector3.distanceTo()` — одноразово при завантаженні, не per-frame
- Функція `dispose()` — диспозити всі PMREM render targets

**Зміна в `src/loaders/sceneLayerLoader.js`:**
- В `loadSceneLayers()` (рядок 329): після `ensureReflectionEnvironment()` додати завантаження probes.glb
- Парсити probe-ноди, побудувати env maps
- Зберегти probe manager як доступний для layer loading

**Зміна в `src/materials/reflectionEnvironment.js`:**
- `getEnvironmentMap()` зараз повертає одну текстуру. Треба або:
  - (A) Розширити щоб приймав позицію меша і повертав найближчу probe — **рекомендовано**
  - (B) Або зберегти окремий probe manager і передавати env map напряму в фабрику
- `cubemap.png` contract (`REFLECTION_ENVIRONMENT_ASSET_CONTRACT`) — залишити як fallback на випадок відсутності probes.glb, прибрати пізніше

**Зміна в `src/materials/factories/makeReflectMaterial.js` (рядок 72):**
- Зараз: `material.envMap = reflectionEnvironment.getEnvironmentMap()`
- Після: `material.envMap = reflectionEnvironment.getClosestEnvMap(meshWorldCenter)` або аналогічно
- Потрібно обчислити world-space центр меша: `mesh.geometry.computeBoundingBox()`, потім `boundingBox.getCenter()` в world space

**Зміна в `src/materials/materialPipeline.js`:**
- `makeViewerMaterial()` (рядок 191) вже передає `mesh` у фабрики — world position доступна

### Характеристики
- VRAM: ~2–3 MB на probe (PMREM output 256×256 per face з mip levels). 5 probes ≈ 12–15 MB
- Розмір файлу: 5 панорам 2048×1024 JPEG ≈ 1.5–2.5 MB в GLB
- Призначення probe до меша — одноразове при завантаженні шару, не per-frame

---

## 3. `reflect.glb` — фейкові рефлекти

**Статус:** працює базово. Доробка — використання multi-probe env maps замість одного.

| | Опис |
|---|---|
| Призначення | Об'єкти з фейковими рефлектами (кухонні поверхні, підлога, меблі) |
| Material mode | `reflect` → `MeshPhysicalMaterial` |
| Текстури | Base Color (baked, без glossy pass), Roughness, Metalness, Normal, AO — все опціонально |
| UV-канали | UV0 — baked color, normal; UV1 — roughness, metalness, AO |
| Рефлекти | Так — env map від найближчої probe |
| Fresnel | Вбудований через `ior` в MeshPhysicalMaterial |

### Blender (3D)
- Бейк Base Color **без glossy pass**
- Бейк Roughness, Metalness (і Normal, AO за потреби) окремо
- Текстури підключені у відповідні слоти Principled BSDF
- Якщо нема текстури — числове значення roughness/metalness з матеріалу зберігається в glTF і код його використає

### Код — що змінити

**`src/config/assetsConfig.js`** — asset contract без змін (рядок 129–136)

**`src/config/materialsConfig.js`** — UV-канали вже правильні:
```
reflectUvChannels: { color: 0, roughness: 1, metalness: 1, ao: 1, normal: 0 }
```

**`src/materials/factories/makeReflectMaterial.js` (рядок 72):**
- Змінити `material.envMap = reflectionEnvironment.getEnvironmentMap()` →
  використати probe manager для отримання найближчої env map по позиції меша
- Потрібно: обчислити world center меша з bounding box

**Глобальні ручки** — вже є в `createViewerState.js` (рядок 62–68):
- `envMapIntensity`, `ior`, `specularIntensity`, `metalness`, `envMapRotationY`
- UI слайдери вже підключені в `createViewerApp.js` (рядки 855–874)

**Наступний крок (після базової реалізації):** per-object tweaks
- Розширити `MATERIAL_TWEAKS` записи підтримкою полів: `envMapIntensity`, `ior`, `roughnessMultiplier`, `metalnessOverride`
- В `makeReflectMaterial.js`: якщо tweak має ці поля — використати їх замість глобальних
- Це робити ТІЛЬКИ після того як базова multi-probe система працює і протестована

---

## 4. `glass.glb` — декоративне скло

**Статус:** працює примітивно. Потребує переробки матеріалу.

| | Опис |
|---|---|
| Призначення | Декоративне скло: вази, вода, столешні, скляний декор (**не вікна**) |
| Material mode | `glass` → **`MeshPhysicalMaterial`** (зміна з MeshBasicMaterial) |
| Текстури | Normal map (baked), Roughness (baked), Base Color (опціонально) |
| UV-канали | **UV1 — всі текстури** (normal, roughness, base color якщо є) |
| Рефлекти | Так — env map від найближчої probe |

### Blender (3D)
- Бейк Normal map і Roughness в текстури (унікальні per object, не тайлові)
- Base Color опціонально (для кольорового скла)
- Підключення в Principled BSDF у відповідні слоти
- UV-канал: UV1 для всіх текстур (бо UV0 може не існувати або бути для іншого)

### Код — що змінити

**`src/config/materialsConfig.js`** — додати конфіг UV-каналів для glass:
```js
glassUvChannels: { color: 1, roughness: 1, normal: 1 },
```
Також додати/оновити glass preset (замінить поточний `glassOpacity`, `glassAlphaCutoff`, `glassFresnel`):
```js
glassMaterial: {
    defaultRoughness: 0.1,
    ior: 1.5,
    transmission: 0.95,
    thickness: 0.5,
    envMapIntensity: 1.0,
},
```

**`src/materials/factories/makeGlassMaterial.js`** — ПОВНИЙ ПЕРЕЗАПИС:
- Зараз: `MeshBasicMaterial` + кастомний Fresnel shader patch
- Після: `MeshPhysicalMaterial` з `transmission`, `ior`, `thickness`, `normalMap`, `envMap`
- Патерн: дивитися на `makeReflectMaterial.js` як зразок — та сама структура, але з `transmission` і `transparent: true`
- Env map: отримувати від probe manager (як reflect)
- Normal map: читати з `sourceMaterial.normalMap` через `getMaterialNormalTexture()`
- UV channel override: `applyTextureChannelOverride(normalMap, glassUvChannels.normal)`
- Видалити кастомний Fresnel patch — `MeshPhysicalMaterial` має вбудований
- `depthWrite: false`, `side: DoubleSide` — залишити

**`src/materials/materialPipeline.js`** — оновити case `"glass"` (рядок 226):
- Додати в виклик `makeGlassMaterial` нові залежності: `reflectionEnvironment` (або probe manager), `getMaterialNormalTexture`, `getMaterialRoughnessTexture`, `applyTextureChannelOverride`, `getFallbackTextureChannel`
- Видалити `applyGlassMaterialPatch` з залежностей glass — більше не потрібен

**`src/materials/shaderPatches/applyGlassMaterialPatch.js`** — можна видалити після переходу (або залишити мертвим кодом до повної перевірки)

---

## 5. `windows.glb` — віконне скло

**Статус: НОВИЙ шар, не існує в коді.**

| | Опис |
|---|---|
| Призначення | Скло для вікон — тільки скло, без рам |
| Material mode | `windows` → `MeshPhysicalMaterial` |
| Текстури | Без текстур (тільки числові значення матеріалу) |
| UV-канали | Не потрібні |
| Рефлекти | Так — env map від найближчої probe |

### Blender (3D)
- Тільки геометрія скла вікон, без рам
- Числові значення матеріалу (roughness, ior) задані в Principled BSDF — glTF їх збереже

### Код — що створити

**`src/config/assetsConfig.js`** — додати новий asset contract в `SCENE_LAYER_CONTRACTS`:
```js
createAssetContract({
    id: "windows",
    label: "Windows",
    searchParam: "windows",
    materialMode: "windows",
    required: false,
    localPath: "windows.glb",
}),
```

**`src/config/materialsConfig.js`** — додати preset:
```js
windowsMaterial: {
    ior: 1.5,
    transmission: 0.98,
    roughness: 0.05,
    envMapIntensity: 0.8,
    tintColor: 0xffffff,
    opacity: 1.0,
},
```

**`src/materials/factories/makeWindowsMaterial.js`** — НОВА фабрика:
- Простіша версія glass — `MeshPhysicalMaterial` з `transmission`, `ior`
- Без normal map, без текстур
- Env map від probe manager
- `transparent: true`, `depthWrite: false`, `side: DoubleSide`
- Патерн: скопіювати структуру з `makeGlassMaterial.js` (вже переписаного), прибрати текстурну логіку

**`src/materials/materialPipeline.js`** — додати case `"windows"` в `makeViewerMaterial()` (рядок 191):
```js
case "windows":
    return makeWindowsMaterial({ ... });
```

**`src/materials/materialPipeline.js`** — додати import `makeWindowsMaterial` вгорі файлу

**`src/loaders/sceneLayerLoader.js`** — автоматично підхопить новий шар через `convertMeshForLayer(child, layer.materialMode)` — змін не потрібно

---

## 6. `translucent.glb` — листя та рослинність

**Статус:** працює як alpha cutout. Доробка — fake subsurface + перейменування файлу.

| | Опис |
|---|---|
| Призначення | Листя, плющ, квіти — alpha cutout + просвічуваність |
| Material mode | `alphaCutout` (розширений fake subsurface shader patch) |
| Текстури | Color (baked), Alpha |
| UV-канали | UV0 — color; UV1 — alpha |
| Перейменування | `leaf.glb` → `translucent.glb` |

### Blender (3D)
- Бейк color + alpha як зараз (color на UV0, alpha на UV1)
- **Додатково:** включити в GLB об'єкт `Sun` — код бере з нього rotation як напрямок світла для subsurface
- `Sun` — це стандартний Blender Sun light або empty з відповідним rotation. glTF зберігає rotation нод.
- Об'єкти в шарі: дерева (2 меші), плющ (1 меш), квіти (1 меш) — білі

### Код — що змінити

**`src/config/assetsConfig.js`** — змінити asset contract:
- `localPath: "leaf.glb"` → `localPath: "translucent.glb"`
- Опціонально: `id: "alpha"` → `id: "translucent"` (але це зламає query string `?alpha=`, тому можна залишити id як є, змінити тільки файл)

**`src/config/materialsConfig.js`** — додати preset:
```js
translucency: {
    strength: 0.5,
    hueDegrees: -5,
    saturationBoost: 0.10,
    brightnessBoost: 0.10,
},
```

**`src/loaders/sceneLayerLoader.js`** — в `loadLayer()` (рядок 233):
- Після `root.traverse()` для alphaCutout шару: знайти ноду `Sun` в root
- `root.getObjectByName("Sun")` → витягти rotation → обчислити forward vector (напрямок світла)
- Видалити Sun ноду зі сцени: `root.remove(sunNode)`
- Зберегти напрямок в глобальне місце (через runtime flag або передачу в material pipeline)

**`src/materials/shaderPatches/` — НОВИЙ файл `applyTranslucencyPatch.js`:**
- Створити `createTranslucencyPatchApplier({ setMaterialCompileHook })`
- Shader patch у фрагментному шейдері:
  - Uniform: `sunDirection` (vec3), `translucencyStrength` (float), `hueDegrees`, `saturationBoost`, `brightnessBoost`
  - Розрахунок: `float backlit = max(0.0, dot(normal, -sunDirection))` — наскільки нормаль повернута від сонця
  - Де backlit > 0: зсув кольору через HSV transform — hue -5deg, sat +10%, bright +10%, помножений на `translucencyStrength * backlit`
- Підключити в `materialPipeline.js`: `createTranslucencyPatchApplier(...)`, аналогічно до `applyGlassMaterialPatch` / `applyFireVideoMaterialPatch`

**`src/materials/materialPipeline.js`** — в `makeViewerMaterial()` case `"alphaCutout"`:
- Після створення матеріалу: якщо шар має translucency (визначити через runtime flag або по layer id), застосувати translucency patch

**`src/materials/factories/makeAlphaCutoutMaterial.js`** — мінімальні зміни:
- Прийняти додатковий параметр `applyTranslucencyPatch` (опціонально)
- Якщо переданий — застосувати до створеного матеріалу

### Примітки
- Білі квіти: hue shift не впливає (білий = без hue), але brightness boost дасть легке свічення — ок
- Alpha cutout залишається як є — subsurface це лише колірна корекція в шейдері, не зміна прозорості

---

## 7. `bg.glb` — фон (будинки/оточення)

**Статус:** працює, змін не потребує.

| | Опис |
|---|---|
| Призначення | Опціональний шар оточення (будинки навколо) |
| Material mode | `background` → `MeshBasicMaterial` + HSV shader patch + warp/shimmer анімація |

### Blender (3D) / Код
- Без змін. Працює як є.
- Asset contract: `src/config/assetsConfig.js` рядок 82–92
- Фабрика: `src/materials/factories/makeBackgroundMaterial.js`

---

## 8. `sky.glb` — небо

**Статус:** працює. Тільки перейменування.

| | Опис |
|---|---|
| Призначення | Основний шар неба |
| Material mode | `unlitAlpha` → `MeshBasicMaterial` з alpha |
| Перейменування | `BG360.glb` → `sky.glb`, id `bg360` → `sky` |

### Код — що змінити

**`src/config/assetsConfig.js`** рядок 93–100:
```js
// Було:
id: "bg360", label: "BG360", searchParam: "bg360", localPath: "BG360.glb"
// Стає:
id: "sky", label: "Sky", searchParam: "sky", localPath: "sky.glb"
```

Це все. Фабрика `makeUnlitAlphaMaterial` і решта логіки не змінюються.

---

## 9. `fire.glb` — вогонь

**Статус:** працює. Тільки перейменування.

| | Опис |
|---|---|
| Призначення | Анімований вогонь через відео текстуру (`fire.mp4`) |
| Material mode | `fx` → відео текстура + процедурна alpha + bloom |
| Перейменування | `fx.glb` → `fire.glb`, id `fx` → `fire` |

### Код — що змінити

**`src/config/assetsConfig.js`** рядок 137–148:
```js
// Було:
id: "fx", label: "FX", searchParam: "fx", localPath: "fx.glb"
// Стає:
id: "fire", label: "Fire", searchParam: "fire", localPath: "fire.glb"
```

**`fire.mp4`** — без перейменування. `FIRE_VIDEO_ASSET_CONTRACT` без змін.

**Увага:** код в `sceneLayerLoader.js` рядок 154 і `materialPipeline.js` рядок 149–157 використовує `matchIncludes: ["fire", "flame", "ember"]` — це матчить по вмісту імені, не по layer id, тому перейменування id безпечне.

---

## 10. `emissive.glb` — світіння

**Статус: НОВИЙ шар, не існує в коді.**

| | Опис |
|---|---|
| Призначення | Незапечені об'єкти що імітують світіння (лампочки, LED, світильники) |
| Material mode | `emissive` → `MeshBasicMaterial` (unlit) |
| Текстури | Без текстур — колір з emissive color/temperature glTF матеріалу |
| Bloom | Так — той же bloom layer що і fire |

### Blender (3D)
- Emission color/temperature задається в Principled BSDF (Emission socket)
- Blender при glTF експорті **автоматично конвертує** температуру (Kelvins) в RGB `emissiveFactor`
- `emissiveIntensity` задає яскравість — зберігається в glTF

### Код — що створити

**`src/config/assetsConfig.js`** — додати asset contract в `SCENE_LAYER_CONTRACTS`:
```js
createAssetContract({
    id: "emissive",
    label: "Emissive",
    searchParam: "emissive",
    materialMode: "emissive",
    required: false,
    localPath: "emissive.glb",
    runtime: {
        enableBloom: true,
    },
}),
```

**`src/config/materialsConfig.js`** — додати preset:
```js
emissiveMaterial: {
    intensityMultiplier: 1.0,
},
```

**`src/materials/factories/makeEmissiveMaterial.js`** — НОВА фабрика:
- Патерн: найпростіша фабрика, дивитись на `makeBakedMaterial.js` як зразок
- Читає з `sourceMaterial`: `emissive` (Color), `emissiveIntensity` (float)
- Створює `MeshBasicMaterial` з `color` = emissive color з glTF
- Множить яскравість на глобальний `intensityMultiplier`
- Не читає текстури (map/emissiveMap ігноруються)
- `toneMapped: true`

```js
import { MeshBasicMaterial } from "three";

export function makeEmissiveMaterial({
    viewerConfig,
    sourceMaterial,
    mesh,
    findMaterialTweak,
    stampViewerMaterialData,
    applyViewerMaterialPatches,
}) {
    const source = sourceMaterial ?? {};
    const tweak = findMaterialTweak(mesh, source);
    const emissiveColor = source.emissive?.clone?.() ?? source.color?.clone?.();
    const intensity = (source.emissiveIntensity ?? 1)
        * viewerConfig.materialPresets.emissiveMaterial.intensityMultiplier;

    const material = new MeshBasicMaterial({
        name: source.name || "EmissiveMaterial",
        color: emissiveColor,
        transparent: false,
        opacity: 1,
        side: source.side,
    });

    // Яскравість через множення кольору (MeshBasicMaterial не має emissiveIntensity)
    material.color.multiplyScalar(intensity);

    stampViewerMaterialData(material, source, tweak);
    applyViewerMaterialPatches(material, { tweak });
    return material;
}
```

**`src/materials/materialPipeline.js`** — додати:
- Import: `import { makeEmissiveMaterial } from "./factories/makeEmissiveMaterial.js";`
- Case в `makeViewerMaterial()`:
```js
case "emissive":
    return makeEmissiveMaterial({
        viewerConfig,
        sourceMaterial,
        mesh,
        findMaterialTweak,
        stampViewerMaterialData,
        applyViewerMaterialPatches,
    });
```

**Bloom:** runtime flag `enableBloom: true` вже обробляється в `createSelectiveBloomPipeline.js` — об'єкти з цього шару автоматично потраплять на bloom layer. Перевірити що логіка `syncTargets` в `createSelectiveBloomPipeline.js` використовує `layer.runtime.enableBloom`.

**Глобальні ручки:**
- `bloomStrength` — спільний з fire, вже є
- `emissiveIntensityMultiplier` — новий, через `materialsConfig.js`
- UI слайдер для intensity multiplier — додати пізніше, якщо потрібно

---

## Зведена таблиця змін

| Шар | Файл | Статус | Нові файли коду | Файли для зміни |
|---|---|---|---|---|
| scene | `scene.glb` | Без змін | — | — |
| probes | `probes.glb` | **Новий** | `src/materials/probeEnvironmentManager.js` | `assetsConfig.js`, `sceneLayerLoader.js`, `reflectionEnvironment.js` |
| reflect | `reflect.glb` | Доробка | — | `makeReflectMaterial.js` |
| glass | `glass.glb` | Переробка | — | `makeGlassMaterial.js` (перезапис), `materialPipeline.js`, `materialsConfig.js` |
| windows | `windows.glb` | **Новий** | `src/materials/factories/makeWindowsMaterial.js` | `assetsConfig.js`, `materialPipeline.js`, `materialsConfig.js` |
| translucent | `translucent.glb` | Доробка | `src/materials/shaderPatches/applyTranslucencyPatch.js` | `assetsConfig.js`, `materialPipeline.js`, `makeAlphaCutoutMaterial.js`, `sceneLayerLoader.js`, `materialsConfig.js` |
| bg | `bg.glb` | Без змін | — | — |
| sky | `sky.glb` | Rename | — | `assetsConfig.js` |
| fire | `fire.glb` | Rename | — | `assetsConfig.js` |
| emissive | `emissive.glb` | **Новий** | `src/materials/factories/makeEmissiveMaterial.js` | `assetsConfig.js`, `materialPipeline.js`, `materialsConfig.js` |

## Assets на сервері (фінальний список)

```
scene.glb          (required)
probes.glb         (optional, але потрібен для reflect/glass/windows)
reflect.glb        (optional)
glass.glb          (optional)
windows.glb        (optional)
translucent.glb    (optional)
bg.glb             (optional)
sky.glb            (optional)
fire.glb           (optional)
fire.mp4           (optional, потрібен для fire.glb)
emissive.glb       (optional)
```

`cubemap.png` — **видалений**. Проби повністю замінили cubemap, fallback — RoomEnvironment.

---

## Результати тестової сесії (2026-05-04)

Весь код шарів було імплементовано і протестовано наживо. Нижче — що працює, що захардкоджено для тестів, і що залишилось.

### Що працює

- **Probes** — завантажуються з `probes.glb`, панорами конвертуються через PMREM, найближча проба призначається per-mesh. Фікс орієнтації: glTF ImageBitmap фліпається через Canvas перед PMREM. `cubemap.png` видалений повністю, fallback — Three.js RoomEnvironment.
- **Reflect** — MeshPhysicalMaterial з envMap від найближчої проби. Відбиття працюють.
- **Windows** — MeshPhysicalMaterial з transmission. Прибрано `transparent: true` + `depthWrite: false` (конфліктували з transmission render pass, викликали блимання). Чисте прозоре скло.
- **Glass** — аналогічний фікс transparent/depthWrite. Додано процедурний Canvas noise як bumpMap для тесту рельєфу. Refraction майже вимкнений (`ior: 1.01`, `thickness: 0`) — на прямих формах (столешня, вази) сильний refraction виглядає некоректно.

### Захардкоджені тестові значення (повернути коли будуть текстури)

- **Reflect**: `roughness` і `metalness` примусово з preset, ігнорують source material з GLB. `roughnessMap: null`, `metalnessMap: null`. Поточні значення: roughness=0 (ідеально гладкий), metalness=0. Файли: `makeReflectMaterial.js`, `materialsConfig.js`.
- **Glass**: `roughness` примусово з preset (0.1), ігнорує GLB. Процедурний bump (`bumpScale: 0.5`, `repeat: 2×2`) — тимчасовий, видалити коли будуть реальні normal maps. Файл: `makeGlassMaterial.js`.
- **Windows**: `roughness` примусово з preset (0.05), ігнорує GLB. Файл: `makeWindowsMaterial.js`.

### Наступні кроки

- Підготувати правильні проби (4-5 штук у правильних позиціях)
- Запекти PBR текстури для reflect (roughness, metalness на UV1) — тоді повернути source material readback
- Запекти normal map для glass — тоді видалити процедурний bump
- Вирішити питання підлоги (Floor Generator з плашками по 1 полігону для нормального UV split)
- TAA (temporal antialiasing) — потрібен для згладжування мерехтіння bump/Френеля при русі камери. Camera-only reprojection достатньо для статичної сцени.
