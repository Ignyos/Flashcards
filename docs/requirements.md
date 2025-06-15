# Opening the site
Opening the site checks if you are signed in.
- If you are not signed in, it takes you to the splash page.
  - After signing in or signing up, it behaves the same as if you were signed in when opening the site. 
- If you are signed in, it checks if you have an open quiz that is not paused.
  - If you have an open running quiz, it takes you to the quiz page to continue.
  - If you do not have an open running quiz, it takes you to the focus page.
- When not on the Splash or Quiz page, there are three navigation options: Focus, Subjects, and Settings

<br/>

# The pages

## 1. [Focus](#focus) To see current progress and start quizes
## 2. [Quiz](#quiz) Where the quizes are taken
## 3. [Subject List](#subjectList) Where subjects are managed
## 3. [Subject Edit](#subjectEdit) Where subjects are added and modified
## 4. [Settings](#settings) Where behaviors are managed
## 5. [Splash](#splash) An info page about the site

<br/>

# Focus <a name="focus"></a>
Displays a list of focus subjects
- Subjects can be added and removed from the focus list using the Subject page.
- Each subject has a checkbox for selecting it to include in a quiz. This checkbox is disabled if there is an open quiz. 
- Each subject displays the current average score.
- The date range of the data included is displayed in a header.
- The date range is a behavior that can be set in the settings page. E.G. If you only want to see the last 90 days.
----
If there is an open/incomplete quiz, it lets you know along with how many days since the quiz was started; "You have an open quiz you started 3 days ago". Along with two options.
- Continue: Pick up where you left off.
- Close: Marks the quiz as complete.
----
If there is no open/incomplete quiz, it displays an option to start a new one. "Quiz Me!"
- The subjects included are the ones check marked above. At least one must be checked.
- The number of questions and which questions are selected are behaviors that can be set in the settings page.

<br/>

# Quiz <a name="quiz"></a>
Continuing or starting a new quiz from the focus page brings you to the quiz page.
- The menu tabs are not displayed during a quiz.
- There is a pause button at the top that takes you back to the focus page.
- Number of questions remaining is shown at the top.
- The quiz operates by showing you one question at a time.
  - You are given an option to show the answer.
  - Once the answer is revealed, you have two buttons: Correct, Incorrect
  - Once you select Correct or Incorrect, the next question is shown.
- Once you answer all the questions, a pop up shows you your quiz stats: Number of questions correct, number incorrect, percent correct.
- Closing the pop up takes you back to the focus page.

<br/>

# Subject List <a name="subjectList"></a>

- Displays a text input with a button to add a new subject.
  - The input is for the subject title.
  - Clicking the button creates the subject then takes you to the Subject Edit page
- Displays a paginated list of all subjects. Each subject has:
  - A checkbox that indicates if it is a focus subject.
  - Some basic stats shown.
    - Count of questions
  <!-- - An info icon that shows the description -->
  - Edit button that opens the Subject Edit page
  - Delete button that opens a confirmation dialogue

<br/>

# Subject Edit <a name="subjectEdit"></a>
## Header
- Displays the subject name.
<!-- - Displays the subject name and description. -->
- Displays a button for adding a new topic.
  - Click the button shows a modal with:
  - One fields: Name (required)
  - Button for saving.
  - Button for canceling.
- Displays a button for adding a new question.
  - Click the button shows a modal with:
  - Two fields: Phrase (required), Answer (required).
  - Select list of topics to list the question under.
  - Button for saving.
  - Button for canceling.
## List Section
- The list contains all the questions for the subject grouped by topic
- Questions may be but are not required to be grouped under a topic.
- Any questions not associated with a topic are shown in a "no topic" group at the bottom.
- Each topic has a button to collapse/expand it
  - Collapsed, it shows just the name and count of questions
  - Expanded it shows the description under the name and a list of questions
- Each topic has buttons to edit & delete
- Questions display their short phrase in the list.
- Questions can be dragged and dropped from one topic to another
- Questions have buttons to edit & delete

<br/>

# TODO: Spec endpoints from this point down.

# Settings <a name="settings"></a>
- Set the date range used to calculate current stats on the focus page. E.G. 60 days
- Set resume open quiz on sign in.
- Question selection method for a new quiz.
  - Set the number of questions a new quiz will have.
  - Select questions that have never been asked before ones that have.
  - Select questions that have the lowest score first.

<br/>

# Splash <a name="splash"></a>

Has a description of the application.
