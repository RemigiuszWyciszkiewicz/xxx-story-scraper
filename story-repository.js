import pkg from "pg";
const { Pool } = pkg;
import { v4 as uuidv4 } from "uuid";

const pool = new Pool({
  //host: "54.37.136.48",
  host: "localhost",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "remik",
});

export async function saveStory(story) {
  const storyId = uuidv4();

  var categoryId = await getCategoryByName(story.category);

  if (!categoryId) {
    categoryId = await saveCategory(story.category);
  }

  var authorId = await getAuthorByName(story.author);

  if (!authorId) {
    authorId = await saveAuthor(story.authorName, story.authorUrl);
  }

  try {
    const query =
      "INSERT INTO story.story(id, date, description, source, raw_content, title, views, rating, story_origin_url, author_id, category_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)";
    const values = [
      storyId,
      story.date,
      story.description,
      story.source,
      story.text,
      story.title,
      story.views ? story.views + "" : null,
      story.rating,
      story.storyOriginUrl,
      authorId,
      categoryId,
    ];

    const { addStoryResult } = await pool.query(query, values);

    story.tags.forEach(async (tag) => {
      const queryTag = "SELECT id FROM story.tag t where t.name LIKE $1";
      const { rows } = await pool.query(queryTag, [tag]);
      if (!rows.length) {
        const insertTag = "INSERT INTO story.tag(id, name) VALUES($1, $2)";
        const tagId = uuidv4();
        await pool.query(insertTag, [tagId, tag]);
        const insertstoryTag =
          "INSERT INTO story.story_tag(story_id, tag_id) VALUES($1, $2)";
        await pool.query(insertstoryTag, [storyId, tagId]);
      } else {
        const tagId = rows[0].id;
        const insertstoryTag =
          "INSERT INTO story.story_tag(story_id, tag_id) VALUES($1, $2)";
        await pool.query(insertstoryTag, [storyId, tagId]);
      }
    });

    return storyId;
  } catch (err) {
    console.error(err);
  } finally {
  }
}

export async function getCategoryByName(name) {
  const queryCategory = "SELECT id FROM story.category c where c.name LIKE $1";
  const { rows } = await pool.query(queryCategory, [name]);

  return rows[0]?.id;
}

export async function saveCategory(categoryName) {
  const insertcategory = "INSERT INTO story.category(id, name) VALUES($1, $2)";
  const categoryId = uuidv4();
  await pool.query(insertcategory, [categoryId, categoryName]);

  return categoryId;
}

export async function getAuthorByName(name) {
  const queryauthor = "SELECT id FROM story.author a where a.name LIKE $1";
  const { rows } = await pool.query(queryauthor, [name]);

  return rows[0]?.id;
}

export async function saveAuthor(name, authorUrl) {
  const insertAuthor =
    "INSERT INTO story.author(id, name, author_url) VALUES($1, $2, $3)";
  const authorId = uuidv4();
  await pool.query(insertAuthor, [authorId, name, authorUrl]);

  return authorId;
}

export async function saveLink(link) {
  const linkId = uuidv4();
  try {
    const query =
      "INSERT INTO story.literotica_link_v2(id, link, date, category) VALUES($1, $2, $3, $4)";
    const values = [linkId, link.link, link.date, link.category];

    await pool.query(query, values);

    return "ok";
  } catch (err) {
    console.error(err);
  } finally {
    // await pool.end();
  }
}

export async function getLink(offset = 0) {
  try {
    const getLinksQuery = `SELECT * FROM story.literotica_link LIMIT 100 OFFSET ${offset}`;
    const { rows } = await pool.query(getLinksQuery);

    return rows;
  } catch (err) {
    console.error(err);
  } finally {
  }
}

export default saveStory;
