
// document.getElementById('runButton').addEventListener('click', function() {
//     const code = document.getElementById('codeInput').value;
//     const outputDiv = document.getElementById('output');
//     outputDiv.innerHTML = ""; // 清除之前的输出

//     // 临时覆盖 console.log 以捕获输出
//     const originalConsoleLog = console.log;
//     console.log = function(message) {
//       outputDiv.innerHTML += message + "<br>";
//     };

//     try {
//       // 使用 Function 构造函数来安全地执行代码
//       new Function(code)();
//       if (outputDiv.innerHTML === "") {
//         outputDiv.innerHTML = "代码已执行，无输出。";
//       }
//     } catch (error) {
//       outputDiv.innerHTML = "错误: " + error.message;
//     }

//     // 恢复 console.log
//     console.log = originalConsoleLog;
// });

document.getElementById('runButton').addEventListener('click', function() {
    const code = document.getElementById('codeInput').value;
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = ""; // Clear previous output

    // Create a sandboxed iframe for isolated execution
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none'; // Hide the iframe
    document.body.appendChild(iframe);

    // Function to receive messages from the iframe
    function handleIframeMessage(event) {
        if (event.data.type === 'output') {
            outputDiv.innerHTML += event.data.message + "<br>";
        } else if (event.data.type === 'error') {
            outputDiv.innerHTML = "Error: " + event.data.message;
        }
    }
    
    window.addEventListener('message', handleIframeMessage);

    const iframeScript = `
        window.addEventListener('message', function(event) {
            if (event.data.type === 'runCode') {
                try {
                    const output = [];
                    const originalConsoleLog = console.log;
                    console.log = function(message) { output.push(message); };
                    new Function(event.data.code)();
                    console.log = originalConsoleLog;

                    if (output.length === 0) {
                        output.push("Code executed without output.");
                    }

                    output.forEach(msg => window.parent.postMessage({ type: 'output', message: msg }, '*'));
                } catch (error) {
                    window.parent.postMessage({ type: 'error', message: error.message }, '*');
                }
            }
        });
    `;

    // Add the script to the iframe
    const script = iframe.contentDocument.createElement('script');
    script.textContent = iframeScript;
    iframe.contentDocument.body.appendChild(script);

    // Send code to the iframe for execution
    iframe.contentWindow.postMessage({ type: 'runCode', code: code }, '*');

    // Cleanup: remove the iframe after execution to avoid potential memory leaks
    setTimeout(() => {
        window.removeEventListener('message', handleIframeMessage);
        document.body.removeChild(iframe);
    }, 1000);
});