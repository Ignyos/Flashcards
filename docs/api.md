# **Endpoints**

**GET** /FocusSubject/List?page=[int]&per-page=[int]

   Return a list of [FocusSubjectView](#FocusSubjectView) by user.

----
<br/>

**GET** /Question/ListItems?topicId=[int|null]&page=[int]&per-page=[int]

   Returns a list of [QuestionListItem](#QuestionListItem) by subject

----
<br/>

**PUT** /Question

   Update a [Question](#Question).

----
<br/>

**POST** /Question

   Create a new [Question](#Question) associated with a subject and optionally a topic within that subject.

----
<br/>

**DELETE** /Question?id=[int]

   Delete a [Question](#Question). Sets the DeleteDateUTC of the question to the current time UTC.

----
<br/>

**POST** /Quiz

   Create a new [Quiz](#Quiz) and return its [OpenQuiz](#OpenQuiz). The body of the request should contain the [QuizConfig](#QuizConfig) which is derived from the users settings. If a config option is missing, the default is used.

----
<br/>

**PUT** /QuizQuestion?id=[int]&correct=[bool]

   Sets the Correct value to true or false for the [QuizQuestion](#QuizQuestion) id passed in.

----
<br/>

**!!DONE!!**

**GET** /OpenQuiz

   If there is an open quiz, returns [OpenQuiz](#OpenQuiz) else null.

----
<br/>

**PUT** /Quiz/Close?id=[int]

   Deletes all the unanswered questions for that quiz and sets the complete date.

----
<br/>

**GET** /Setting

   Return the [Setting](#Setting) by user or null.

----
<br/>

**PUT** /Setting

   Update the [Setting](#Setting) for the user.

----
<br/>

**POST** /Setting

   Create new [Setting](#Setting) for the user.

----
<br/>

**GET** /Subject?id=[int]

   Returns 

----
<br/>

**GET** /Subject/List?page=[int]&per-page=[int]

   Return a list of [SubjectView](#SubjectView) by user.

----
<br/>

**GET** /Topic/List?subjectId=[int]

   Get a list of [Topic](#Topic) by subject.

----
<br/>

**PUT** /Topic

   Update a [Topic](#Topic).

----
<br/>

**POST** /Topic

   Create new [Topic](#Topic) associated with a subject.

----
<br/>

**DELETE** /Topic?Id=[int]

   Delete a [Topic](#Topic). Sets the DeleteDateUTC of the topic to the current time UTC.

----
<br/><br/><br/>

# **Database Models**

Setting <a name="Setting"></a>

      {
         "ResumeQuizOnOpen":<bool>,
         "FocusSubjects":{
            "DayRangeToCalculate":<int>,
            "MaxFocusSubjectCount":5,
         }
         "NewQuiz":{
            "SubjectIds":[ <int> ],
            "QuestionCount":<int>,
            "PreferUnansweredQuestions":<bool>,
            "PreferLowScoreQuestions":<bool>,
         }
      }

---
Question <a name="Question"></a>

      {
         "Id":<int>,
         "SubjectId":<int>,
         "TopicId":<int|null>,
         "Phrase":<string>,
         "Answer":<string>,
         "DeleteDate":<string|null>
      }

---
QuestionListItem <a name="QuestionListItem"></a>

      {
         "Id":<int>
         "ShortPhrase":<string>
      }

---
Quiz <a name="Quiz"></a>

      {
         "Id":<int>,
         "AccountId":<int>,
         "StartDateTime":<string>,
         "CompleteDateTime":<string>|<null>,
      }

----
QuizQuestion <a name="QuizQuestion"></a>

      {
         "Id":<int>,
         "QuizId":<int>,
         "QuestionId":<int>,
         "Correct":<bool|null>,
      }

----
Topic <a name="Topic"></a>

      {
         "Id":<int>,
         "SubjectId":<int>,
         "Title":<int>,
         "DeleteDate":<string|null>
      }

----
<br/><br/><br/>

# **View**

FocusSubjectView <a name="FocusSubjectView"></a>

      [
         {
            "SubjectId":<int>,
            "SubjectName":<string>,
            <!-- "SubjectDescription":<string>, -->
            "DaysSinceLastStudy":<int>,
            "CorrectCount":<int>,
            "QuestionCount":<int>
         }
      ]

----
SubjectView <a name="SubjectView"></a>

      [
         {
            "SubjectId":<int>,
            "SubjectName":<string>,
            <!-- "SubjectDescription":<string>, -->
            "TopicCount":<int>,
            "QuestionCount":<int>
         }
      ]

----
OpenQuiz <a name="OpenQuiz"></a>

      {
         "QuizId":<int>,
         "StartDateTime":<string>,
         "QuestionCount":<int>,
         "CorrectCount":<int>,
         "IncorrectCount":<int>,
         "UnansweredQuizQuestionIds":[<int>]
      }

----