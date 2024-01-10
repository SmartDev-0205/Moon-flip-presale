/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],

  theme: {
    fontFamily: {
      "GothamPro-Regular": ["GothamPro-Regular"],
      "GothamPro-Bold": ["GothamPro-Bold"],
      "cocogoose": ["cocogoose"],
    },
    extend: {
      colors: {
        black: "#000000",
        white: "#ffffff",

        bgBtn: "#182B48",
        bgLight: "#f1f4f6",
        borderColor: "#4ACFFF",
      },
    },
  },
  plugins: [],
};
