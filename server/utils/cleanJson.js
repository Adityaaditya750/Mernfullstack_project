const cleanJson = (text) => {

    if (!text) return "";

    return text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

};

module.exports = cleanJson;