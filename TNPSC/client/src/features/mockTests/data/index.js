import { group1Questions } from "./questions/group1";
import { group2Questions } from "./questions/group2";
import { group2aQuestions } from "./questions/group2a";
import { group4Questions } from "./questions/group4";
import { vaoQuestions } from "./questions/vao";
import { policeQuestions } from "./questions/police";

export const examQuestionMap = {
  "group-1": group1Questions,
  "group-2": group2Questions,
  "group-2a": group2aQuestions,
  "group-4": group4Questions,
  vao: vaoQuestions,
  police: policeQuestions,
};