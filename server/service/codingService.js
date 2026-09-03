const axios = require("axios");
const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");

const PISTON_URL =
    "http://localhost:2000/api/v2/execute";

const languageMap = {
    javascript: "javascript",
    js: "javascript",

    python: "python",
    python3: "python",

    java: "java",

    c: "c",

    cpp: "c++",
    "c++": "c++",

    go: "go",

    rust: "rust"
};


/*
=====================================
Execute Code
=====================================
*/

const executeCode = async (
    language,
    code,
    input = ""
) => {

    try {

        const normalizedLanguage =
            languageMap[language.toLowerCase()] ||
            language;

        const response = await axios.post(

            PISTON_URL,

            {
                language: normalizedLanguage,

                version: "*",

                files: [
                    {
                        content: code
                    }
                ],

                stdin: input
            },

            {
                headers: {
                    "Content-Type": "application/json"
                },

                timeout: 60000
            }

        );

        return response.data;

    }

    catch (error) {

        console.error(
            "Piston Execution Error:",
            error.code,
            error.message
        );

        console.error(
            error.response?.data
        );

        throw new Error(
            error.response?.data?.message ||
            "Code execution failed"
        );

    }

};


module.exports = {
    executeCode
};