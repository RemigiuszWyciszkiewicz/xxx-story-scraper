import * as cheerio from "cheerio";
import axios from "axios";
import { saveLink, getLink, saveStory } from "./story-repository.js";
import axiosRetry from "axios-retry";
import fs from "node:fs";
import { log } from "node:console";
import test from "node:test";

axiosRetry(axios, {
  retries: 5, // Number of retries
  retryCondition: () => true,
  retryDelay: (retryCount) => retryCount * 2000,
});

const getStoriesPage = async (pageUrl) => {
  try {
    const response = await axios.get(pageUrl, {
      headers: {
        "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36`,
        "Accept-Language": `en-US,en;q=0.5`,
        "Accept-Encoding": `gzip, deflate, br`,
        Accept: `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,`,
        Referer: `http://www.google.com/`,
      },
    });

    return response;
  } catch (error) {
    console.log(error);
  }
};

const getNumberOfPages = async (categoryUrl) => {
  try {
    const response = await getStoriesPage(categoryUrl + "/1-page");
    const $ = cheerio.load(response.data);
    return $("select>option").length;
  } catch (error) {
    console.log(error);
  }
};

const getCategoryLinks = async (category) => {
  try {
    const pagesCount = await getNumberOfPages(category.link);
    const links = [];

    console.log("pagesCount", pagesCount);

    for (let index = 0; index < pagesCount; index++) {
      await sleep(1621);

      const response = await getStoriesPage(
        category.link + `/${index + 1}-page`
      );
      const $ = cheerio.load(response.data);

      $(".b-sl-item-r").each(async (i, x) => {
        const link = $(x).find("h3>a").attr("href");
        const date = $(x).find(".b-sli-date").text();
        await saveLink({
          link,
          date,
          category: category.text,
        });
      });

      console.log(`Saved paged:${index + 1}, Category: ${category.text}`);
    }

    console.log("Total links", links.length);
  } catch (error) {
    console.log(error);
  }
};

const getLinks = async () => {
  try {
    const response = await axios.get(`https://literotica.com/stories/`, {
      headers: {
        "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36`,
        "Accept-Language": `en-US,en;q=0.5`,
        "Accept-Encoding": `gzip, deflate, br`,
        Accept: `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,`,
        Referer: `http://www.google.com/`,
      },
    });
    const $ = cheerio.load(response.data);
    const categories = [];

    $(".bh_gP")[4].children.forEach((i) => {
      const text = $(i).find("a").text();
      const link = $(i).find("a").attr("href");

      categories.push({
        text: text,
        link: link,
      });
    });

    for (let index = 0; index < categories.length; index++) {
      await sleep(2221);
      await getCategoryLinks(categories[index]);
    }
  } catch (error) {
    console.log(error);
  }
};

const getStoryPage = async (url) => {
  try {
    const proxyUrl =
      "https://worker-wispy-glitter-a697.remigiusz-wyciszkiewicz.workers.dev/proxy?modify&proxyUrl=";
    return await axios.get(proxyUrl + url, {
      headers: {
        "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36`,
        "Accept-Language": `en-US,en;q=0.5`,
        "Accept-Encoding": `gzip, deflate, br`,
        Accept: `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,`,
        Referer: `http://www.google.com/`,
      },
    });
  } catch (error) {
    console.log(error);
  }
};

const getStory = async ({ id, link, date }) => {
  try {
    const firstPageResponse = await getStoryPage(link);

    const $ = cheerio.load(firstPageResponse.data);

    let numberOfPages = 0;

    const tags = [];

    let authorName;
    let authorUrl;
    let title;
    let description;
    let rating;
    let views;
    let text;
    let categoryName;

    let source = "literotica.com";

    authorName = $(".y_eS>.y_eU ").first().text();
    authorUrl = $(".y_eS>.y_eU ").first().attr("href");
    title = $(".headline ").text();
    description = $(".bn_B").first().text();
    rating = $(".aT_cl").first().text();
    categoryName = $(".h_aZ").eq(1).text();
    views = $(".aT_cl").eq(1).text();
    numberOfPages = Number($(".l_bJ").last().text());

    $(".av_as").each((i, e) => {
      tags.push($(e).text());
    });

    text = $(".panel>.aa_ht>div").html();

    if (numberOfPages > 1) {
      for (let index = 2; index <= numberOfPages; index++) {
        const anotherPageReponse = await getStoryPage(link + "?page=" + index);

        const $ = cheerio.load(anotherPageReponse.data);
        text = text + $(".panel>.aa_ht>div").html();
      }
    }

    return await saveStory({
      date: date,
      description: description,
      source: source,
      text: text?.trim(),
      title: title?.trim(),
      views: views,
      rating: rating,
      storyOriginUrl: link,
      tags: tags,
      authorName: authorName,
      authorUrl: authorUrl,
      category: categoryName,
    });
  } catch (error) {
    console.log(error);
    const CreateFiles = fs.createWriteStream("./error_log.txt", {
      flags: "a",
    });
    CreateFiles.write(JSON.stringify(error) + "\r\n");
  }
};

async function start() {
  // await getLinks();
  let offset = 124200;

  let storyCount = 638033;
  let currentStoryIndex = 124200;

  for (let index = 1242; index < storyCount / 100; index++) {
    const links = await getLink(offset);

    for (let index = 0; index < links.length; index++) {
      const link = links[index];
      const storyId = await getStory(link);

      currentStoryIndex++;

      console.log("Saved story:", currentStoryIndex, " url: " + link.link);

      const CreateFiles = fs.createWriteStream("./progeress.txt", {
        flags: "a",
      });
      if (storyId) {
        CreateFiles.write(
          "Saved story: " +
            storyId +
            "; currentStoryIndex: " +
            currentStoryIndex +
            "\r\n"
        );
      } else {
        CreateFiles.write("Error: " + link.link + "\r\n");
      }
    }

    offset = offset + 100;
  }
}

start().then();

async function sleep(millis) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}

// Story bdsm library count - 10849
// literotica Link count - 638033
// last session - 124200

// 25400 - 23:24
