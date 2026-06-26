importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.js");

let stdOutAndErr = [];

let pyodideReadyPromise = loadPyodide({
    stdout: (data) => stdOutAndErr.push(data),
    stderr: (data) => stdOutAndErr.push(data),
});

let alreadySetBuff = false;

self.onmessage = async (event) => {
    stdOutAndErr = [];

    // make sure loading is done
    const pyodide = await pyodideReadyPromise;
    const { id, python, context, interruptBuffer } = event.data;

    if (interruptBuffer && !alreadySetBuff) {
        pyodide.setInterruptBuffer(interruptBuffer);
        alreadySetBuff = true;
    }

    // Now load any packages we need, run the code, and send the result back.
    await pyodide.loadPackagesFromImports(python);

    // Set matplotlib backend to Agg to avoid js.document error in worker
    try {
        await pyodide.runPythonAsync(`
try:
    import matplotlib
    matplotlib.use('Agg')
except Exception:
    pass
        `);
    } catch (e) {
        console.warn("Failed to set matplotlib backend:", e);
    }

    // make a Python dictionary with the data from content
    const dict = pyodide.globals.get("dict");
    const globals = dict(Object.entries(context || {}));
    try {
        self.postMessage({ id, running: true });
        // Execute the python code in this context
        const result = pyodide.runPython(python, { globals });

        // Extract any matplotlib figures if matplotlib is imported
        let images = [];
        try {
            const hasMatplotlib = pyodide.runPython(`
import sys
'matplotlib' in sys.modules
            `);
            if (hasMatplotlib) {
                const pyList = pyodide.runPython(`
import io
import base64
import matplotlib.pyplot as plt
fig_urls = []
for i in plt.get_fignums():
    try:
        fig = plt.figure(i)
        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight')
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        fig_urls.append("data:image/png;base64," + img_str)
    except Exception:
        pass
plt.close('all')
fig_urls
                `);
                if (pyList && typeof pyList.toJs === 'function') {
                    images = pyList.toJs();
                    pyList.destroy();
                }
            }
        } catch (e) {
            console.warn("Failed to extract matplotlib figures:", e);
        }

        self.postMessage({ result: result ? result.toString() : "", id, stdOutAndErr, images });
    } catch (error) {
        self.postMessage({ error: error.message, id });
    }
    if (interruptBuffer) {
        interruptBuffer[0] = 0;
    }
};
