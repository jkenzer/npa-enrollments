var fs = require("fs");
var csv = require("fast-csv");

const inputFile = "client-enrollments.csv";
const npaData = [];
const parsedData = new Map();
const datePast = new Date(2017, 12, 31);
const activeStudents = [];
const keepStudents = [];
const archiveStudents = [];

const inputFilePromise = new Promise((resolve) => {
  csv
    .parseFile(inputFile, { headers: true })
    .on("error", (error) => console.error(error))
    .on("data", (row) => npaData.push(row))
    .on("end", (rowCount) => {
      resolve();
      console.log(`Total Lines: ${rowCount}`);
    });
});

Promise.all([inputFilePromise]).then(() => {
  npaData.forEach((row, index) => {
    const clientName = row["Client Name"].trim();
    if (parsedData.has(clientName)) {
      let currentStudent = parsedData.get(clientName);
      currentStudent.enrollments.push(row["Enrolled"]);
      if (!row["Terminated"]) {
        currentStudent["active"] = true;
      } else {
        let [month, day, year] = row["Terminated"].split(" ")[0].split("/");
        currentStudent.terminations.push(new Date(year, month - 1, day));
      }
      parsedData.set(clientName, currentStudent);
    } else {
      let currentStudent = {
        office: row["Office"],
        clientStatus: row["Clent Status"],
        clientType: row["Client Type"],
        enrollments: [row["Enrolled"]],
        terminations: [row["Terminated"]]
      };
      if (!row["Terminated"]) {
        currentStudent["active"] = true;
      } else {
        let [month, day, year] = row["Terminated"].split(" ")[0].split("/");
        currentStudent.terminations.push(new Date(year, month - 1, day));
      }
      parsedData.set(clientName, currentStudent);
    }
  });
  let countOfActive = 0;
  for (let [key, value] of parsedData) {
    if (value.active) {
      countOfActive++;
      activeStudents.push({
        "Student Name": key,
        Office: value.office,
        "Client Status": value.clientStatus,
        "Client Type": value.clientType
      });
    } else {
      value.terminations = value.terminations.sort((a, b) => b.date - a.date);
      let lastDate = value.terminations[value.terminations.length - 1];
      if (lastDate < datePast) {
        archiveStudents.push({
          "Student Name": key,
          Office: value.office,
          "Client Status": value.clientStatus,
          "Client Type": value.clientType
        });
      } else {
        keepStudents.push({
          "Student Name": key,
          Office: value.office,
          "Client Status": value.clientStatus,
          "Client Type": value.clientType
        });
      }
    }
  }
  console.log("Individual Students", parsedData.size);
  console.log(`Active students ${activeStudents.length}`);
  console.log(`Keep students ${keepStudents.length}`);
  console.log(`Archive students ${archiveStudents.length}`);
  // console.table(archiveStudents);
  csv
    .writeToPath("activeStudents.csv", activeStudents, { headers: true })
    .on("error", (error) => console.error(error))
    .on("finish", () => console.log(`Done with Active Students`));
  csv
    .writeToPath("keepStudents.csv", keepStudents, { headers: true })
    .on("error", (error) => console.error(error))
    .on("finish", () => console.log(`Done with Keep Students`));
  csv
    .writeToPath("archiveStudents.csv", archiveStudents, { headers: true })
    .on("error", (error) => console.error(error))
    .on("finish", () => console.log(`Done with Archive Students`));
});
