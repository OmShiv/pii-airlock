// Loads the scriptc-built rule engine (airlock-rules.wasm) in a browser or in
// Node, with a minimal WASI Preview 1 adapter: the rules do no file or network
// I/O, so every WASI call except the clock and stdout reports "unsupported".

const ENOSYS = 52;
const EBADF = 8;

function wasiImports(getMemory) {
  const view = () => new DataView(getMemory().buffer);
  const unsupported = () => ENOSYS;
  return {
    environ_sizes_get(countPtr, sizePtr) {
      view().setUint32(countPtr, 0, true);
      view().setUint32(sizePtr, 0, true);
      return 0;
    },
    environ_get: () => 0,
    clock_time_get(_id, _precision, outPtr) {
      const ns = BigInt(Math.round((performance.timeOrigin + performance.now()) * 1e6));
      view().setBigUint64(outPtr, ns, true);
      return 0;
    },
    fd_write(fd, iovs, iovsLen, writtenPtr) {
      const mem = new Uint8Array(getMemory().buffer);
      let text = '';
      let written = 0;
      for (let i = 0; i < iovsLen; i++) {
        const ptr = view().getUint32(iovs + i * 8, true);
        const len = view().getUint32(iovs + i * 8 + 4, true);
        text += new TextDecoder().decode(mem.subarray(ptr, ptr + len));
        written += len;
      }
      (fd === 2 ? console.error : console.log)(text);
      view().setUint32(writtenPtr, written, true);
      return 0;
    },
    fd_prestat_get: () => EBADF,
    fd_prestat_dir_name: () => EBADF,
    fd_fdstat_get: unsupported,
    fd_fdstat_set_flags: unsupported,
    fd_close: unsupported,
    fd_read: unsupported,
    fd_seek: unsupported,
    path_open: unsupported,
    proc_exit(code) {
      throw new Error(`WebAssembly module exited with code ${code}`);
    },
  };
}

// `source` is a URL (browser) or the module bytes (Node).
export async function loadAirlockWasm(source) {
  const t0 = performance.now();
  const module =
    typeof source === 'string'
      ? await WebAssembly.compileStreaming(fetch(source))
      : await WebAssembly.compile(source);
  const t1 = performance.now();
  let api;
  const instance = await WebAssembly.instantiate(module, {
    wasi_snapshot_preview1: wasiImports(() => api.memory),
    scriptc: {
      panic(pointer, length) {
        const bytes = new Uint8Array(api.memory.buffer, pointer, length);
        throw new Error(new TextDecoder().decode(bytes));
      },
    },
  });
  api = instance.exports;
  api._initialize();
  api.airlock_init();
  const t2 = performance.now();

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const slots = api.scriptc_alloc(8); // result pointer and byte length

  function redact(text) {
    const input = encoder.encode(text);
    const ptr = api.scriptc_alloc(Math.max(input.length, 1));
    if (!ptr) throw new Error('scriptc_alloc failed');
    new Uint8Array(api.memory.buffer, ptr, input.length).set(input);
    api.airlock_redact(ptr, input.length, slots, slots + 4);
    api.scriptc_free(ptr);
    const view = new DataView(api.memory.buffer); // memory may have grown
    const outPtr = view.getUint32(slots, true);
    const outLen = view.getUint32(slots + 4, true);
    return decoder.decode(new Uint8Array(api.memory.buffer, outPtr, outLen).slice());
  }

  return { redact, compileMs: t1 - t0, instantiateMs: t2 - t1 };
}
