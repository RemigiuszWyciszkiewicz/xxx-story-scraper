import * as cheerio from "cheerio";
import axios from "axios";
import saveStory from "./story-repository.js";
import axiosRetry from "axios-retry";
import fs from "node:fs";

axiosRetry(axios, {
  retries: 10, // Number of retries
  retryCondition: () => true,
  retryDelay: (retryCount) => retryCount * 2000,
});

const fetchStoryText = async (storyId) => {
  try {
    const response = await axios.get(
      `https://www.bdsmlibrary.com/stories/wholestory.php?storyid=${storyId}`,
      {
        headers: {
          "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36`,
        },
      }
    );

    const $ = cheerio.load(response.data);

    if ($(".storyblock").length) {
      $(".storyblock>meta").remove();
      $(".storyblock>title").remove();
      $(".storyblock>style").remove();
      let data = "";

      $(".storyblock").each((index, element) => {
        console.log(index);
        if (element && $(element).html()) {
          data = data + $(element).html();
        }
      });

      return data;
    } else if ($("pre").length) {
      let data = "";
      $("pre").each((index, element) => {
        if (element && $(element).html()) {
          data = data + $(element).html();
        }
      });
      return data;
    }
  } catch (error) {
    const CreateFiles = fs.createWriteStream("./error_log.txt", {
      flags: "a",
    });
    CreateFiles.write(JSON.stringify(error) + "\r\n");
  }
};

const fetchStory = async (id) => {
  try {
    const response = await axios.get(
      `https://www.bdsmlibrary.com/stories/story.php?storyid=${id}`,
      {
        headers: {
          "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36`,
        },
      }
    );
    const $ = cheerio.load(response.data);
    const tags = [];
    let date;
    let author;
    let title;
    let description;
    let source = "www.bdsmlibrary.com";
    $("font>i>a").each((index, element) => {
      const text = $(element).text();
      tags.push(text);
    });
    title = $("td>b>font").first().text();
    $("font[size='2']>b").each((index, element) => {
      const childred = $(element);
      if (childred[0] && childred[0]?.children[0]?.data === "Added on:") {
        date = childred[0]?.nextSibling?.data;
      }
      if (childred[0] && childred[0]?.children[0]?.data === "Synopsis:") {
        const descriptionRaw = childred[0]?.nextSibling?.data;
        description = descriptionRaw?.trim();
      }
    });
    const authorRaw = $("b>font>a").first().text();
    author = authorRaw.trim();
    await sleep(511);
    const tekst = await fetchStoryText(id);

    console.log("Saving story with id: " + id);

    await saveStory({
      title: title?.trim(),
      tags: tags,
      date: date,
      author: author,
      description: description,
      source: source,
      tekst: tekst?.trim(),
    });
  } catch (error) {
    const CreateFiles = fs.createWriteStream("./error_log.txt", {
      flags: "a",
    });
    CreateFiles.write(JSON.stringify(error) + "\r\n");
  }
};
//7550
async function start() {
  for (let index = 7550; index > 0; index--) {
    await fetchStory(index);
  }
}

start().then();

async function sleep(millis) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}
