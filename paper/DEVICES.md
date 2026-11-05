# Device access and availability

Ownership is based on the user's statements, not inferred from model numbers in marketing material. No device lab/cloud booking or hardware purchase has been made.

| Target | Access evidence | Hardware/browser role | Missing confirmation |
|---|---|---|---|
| Apple M4 Pro Mac | user-reported historical experiment | reproduce Chrome 155 / ORT Web 1.30 and compare current stable Chrome, Edge, Safari, Firefox | locate original machine, original binaries, exact OS/browser build, GPU cores and power settings |
| Apple M5 Pro Mac, 24 GB, 20 GPU cores | current host observed; Chrome 157.0.8103.39 | second Apple generation; current-host execution once dependencies/artifacts available | it is a different host from the M4 result; inference not run |
| Google Pixel 10 Pro XL | user says owned | Android browser and native LiteRT; Android GPU target A | record Android build, actual GPU adapter, driver, available browser providers; do not infer GPU identity from product name |
| Apple iPhone 17 Pro Max | user says owned | iOS Safari and other available browser configurations; additional Apple/mobile result | record OS/build, engine and adapter; browser branding on iOS is not evidence of distinct engines |
| Intel integrated GPU Windows/Linux device | no owned device reported | Intel GPU family; Windows also useful for WebNN and Firefox coverage | real hardware lab, collaborator-free self-access, or validated remote bare-metal session |
| NVIDIA discrete GPU Windows/Linux device | no owned device reported | NVIDIA family, actual local browser GPU | exact GPU/driver/VRAM and browser acceleration validation |
| AMD GPU Windows/Linux device | no owned device reported | AMD family | exact GPU/driver and physical/remote access |
| Android phone with GPU different from Pixel | access needed | Android GPU target B; select a Qualcomm Adreno or Arm Mali/Immortalis device after Pixel adapter is verified | ensure two distinct GPU implementations, not just two phone models |

The Pixel and iPhone do **not** satisfy two Android GPUs. If Pixel reports an Arm GPU, prioritize Adreno; otherwise select an Arm phone. Distinct Android GPU families are preferable to two generations of the same GPU. The M5 host adds within-family replication, not another vendor family.

## Device-lab/cloud qualification checklist

Before treating a remote service as a device result, save real hardware identity, OS/driver/browser build, `navigator.gpu.requestAdapter()` information/features/limits, `isFallbackAdapter`, WebNN context capability and worker/cross-origin-isolation support. Run a small compute/readback correctness probe. Reject software rendering, disabled WebGPU or unidentifiable GPU as evidence for that GPU family. A viewport emulator is not an Android GPU. Virtualized/cloud GPU results form a separately labeled stratum.

A commercial browser/device service is a candidate access route, **not verified available GPU access**. The exact matrix remains unbooked. Use a real device lab/remote machine when browser SaaS cannot expose the required GPU/provider or preserve traces. Do not spend or create accounts without new user authorization.

Record a de-identified device ID, SoC/GPU family, memory, OS build, GPU driver/backend (Metal/D3D/Vulkan), browser engine/build/channel, headful/headless mode, flags, power/thermal/battery state, runtime package/binary hashes, adapter limits/features and actual operator placements in each run manifest. Exclude serials, UUIDs and account/device identifiers. Keep unavailable cells in the report.

Browser capability is a measured factor. [Chrome's implementation overview](https://developer.chrome.com/docs/web-platform/webgpu/overview) documents rollout differences across browsers and OSs; the [ORT WebNN guide](https://onnxruntime.ai/docs/tutorials/web/ep-webnn.html) describes flag-dependent availability and WASM fallback. Probe each installed release; do not assume support from either a specification or this table.
