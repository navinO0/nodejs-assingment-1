const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();
const { isValid } = require("date-fns");
app.use(express.json());
let db = null;

const dbPath = path.join(__dirname, "todoApplication.db");

const initializeServerAndDb = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server is running at http://localhost:3000 port");
    });
  } catch (e) {
    console.log(`db error due to ${e.message}`);
  }
};

initializeServerAndDb();

const checkValidCredentials = (request, response, next) => {
  const { status, priority, todo, category, dueDate } = request.body;
  let permit = true;
  let errorResponse = null;

  if (priority !== undefined) {
    const checkPriority =
      priority === "HIGH" || priority === "MEDIUM" || priority === "LOW";
    if (!checkPriority) {
      errorResponse = "Invalid Todo Priority";
      permit = false;
    }
  }
  if (status !== undefined) {
    const checkStatus =
      status === "TO DO" || status === "IN PROGRESS" || status === "DONE";
    if (!checkStatus) {
      permit = false;

      errorResponse = "Invalid Todo Status";
    }
  }

  if (category !== undefined) {
    const checkCategory =
      category === "HOME" || category === "WORK" || category === "LEARNING";
    if (!checkCategory) {
      permit = false;

      errorResponse = "Invalid Todo Category";
    }
  }
  if (dueDate !== undefined) {
    if (!isValid(new Date(dueDate))) {
      permit = false;
      errorResponse = "Invalid Due Date";
    }
  }
  if (permit) {
    next();
  } else {
    response.status(400);
    response.send(errorResponse);
  }
};

const searchKey = (search_q) => {
  if (search_q === undefined) {
    return "";
  }
  return `todo LIKE '%${search_q}%       ,'`;
};

const getQueryFormat = (requestQ, Query) => {
  if (Query === undefined) {
    return "";
  }
  return `${requestQ} = '${Query}'  AND`;
};

app.get("/todos/", async (request, response) => {
  const { status, priority, category, search_q } = request.query;

  if (priority !== undefined) {
    const validPrioriy =
      priority === "HIGH" || priority === "MEDIUM" || priority === "LOW";
    if (validPrioriy) {
      const preQuery = `${getQueryFormat("status", status)} ${getQueryFormat(
        "category",
        category
      )} ${getQueryFormat("priority", priority)} ${searchKey(search_q)} `;
      const resultQery = preQuery.trim().slice(0, -3);
      const requestQuery = `
    SELECT id, todo, category, priority, status, due_date as dueDate FROM todo WHERE ${resultQery.trim()} ;
    `;
      const alldets = await db.all(requestQuery);

      response.send(alldets);
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else if (status !== undefined) {
    const validateStatus =
      status === "TO DO" || status === "IN PROGRESS" || status === "DONE";
    if (validateStatus) {
      const preQuery = `${getQueryFormat("status", status)} ${getQueryFormat(
        "category",
        category
      )} ${getQueryFormat("priority", priority)} ${searchKey(search_q)} `;
      const resultQery = preQuery.trim().slice(0, -3);
      const requestQuery = `
    SELECT * FROM todo WHERE ${resultQery.trim()} ;
    `;
      const alldets = await db.all(requestQuery);

      response.send(alldets);
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else if (category !== undefined) {
    const validateCategory =
      category === "HOME" || category === "WORK" || category === "LEARNING";
    if (validateCategory) {
      const preQuery = `${getQueryFormat("status", status)} ${getQueryFormat(
        "category",
        category
      )} ${getQueryFormat("priority", priority)} ${searchKey(search_q)} `;
      const resultQery = preQuery.trim().slice(0, -3);
      const requestQuery = `
    SELECT * FROM todo WHERE ${resultQery.trim()} ;
    `;
      const alldets = await db.all(requestQuery);

      response.send(alldets);
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
    }
  }
});

app.get("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const requestQuery = `
    SELECT id, todo, category, priority, status, due_date as dueDate
    FROM todo
    WHERE id = '${todoId}';
    `;
  const todo = await db.get(requestQuery);
  const date = new Date(todo.due_date);

  response.send(todo);
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (date !== undefined) {
    if (!isValid(new Date(date))) {
      response.status(400);
      response.send("Invalid Due Date");
    } else {
      const receivedDate = new Date(date);
      const month = receivedDate.getMonth();
      const getdate = receivedDate.getDate();
      let updateddate = null;
      let modifiedMonth = null;
      if (month < 9) {
        modifiedMonth = `0${month + 1}`;
      } else {
        modifiedMonth = month;
      }
      if (getdate < 9) {
        updateddate = `0${getdate}`;
      } else {
        updateddate = getdate;
      }
      const updatedDate = `${receivedDate.getFullYear()}-${modifiedMonth}-${updateddate}`;

      const requestQuery = `
    SELECT id, todo, category, priority, status, due_date as dueDate
    FROM todo
    WHERE due_date = '${updatedDate}';
    `;

      const todo = await db.all(requestQuery);

      response.send(todo);
    }
  }
});

app.post("/todos/", checkValidCredentials, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  const postReq = `
    INSERT INTO todo(id, todo, priority, status, category, due_date) VALUES(${id}, '${todo}','${priority}','${status}','${category}','${dueDate}');
    `;
  await db.run(postReq);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", checkValidCredentials, async (request, response) => {
  const { todoId } = request.params;
  const { status, priority, todo, category, dueDate } = request.body;

  const preQuery = `${getQueryFormat("status", status)} ${getQueryFormat(
    "category",
    category
  )} ${getQueryFormat("priority", priority)} ${getQueryFormat(
    "todo",
    todo
  )} ${getQueryFormat("due_date", dueDate)} `;

  const resultQery = preQuery.trim().slice(0, -3);
  const updateQuery = `
  UPDATE todo 
  SET 
  ${resultQery}
  WHERE id = ${todoId}
  `;
  await db.run(updateQuery);
  let acknowledge = resultQery;

  if (resultQery.split(" ")[0] === "due_date") {
    acknowledge = "Due Date";
    const responseSend = "Due Date";
    response.send(`${responseSend} Updated`);
  } else {
    const responseSend =
      acknowledge.split(" ")[0][0].toUpperCase() +
      acknowledge.split(" ")[0].slice(1);
    response.send(`${responseSend} Updated`);
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteRequest = `
    DELETE FROM todo WHERE id = ${todoId}
    `;
  await db.run(deleteRequest);
  response.send("Todo Deleted");
});

module.exports = app;
