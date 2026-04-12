# services/data_service.py

# ==========================================
# 1. HARDCODED NUMERACY DATA
# ==========================================
NUMERACY_DATA = [
    {
        "tool_id": "Basic Numeracy Assessment Tool-1",
        "set_id": "SET-A/2024",
        "parts": [
            {
                "name": "Part 1: Number Recognition",
                "sections": [
                    {"level": "LEVEL 1", "numbers": ["4", "8", "1", "7", "3", "5"]},
                    {"level": "LEVEL 2", "numbers": ["30", "53", "61", "96", "47", "12"]},
                    {"level": "LEVEL 3", "numbers": ["402", "971", "541", "884", "609", "920"]},
                    {"level": "LEVEL 4", "numbers": ["3522", "8045", "1002", "6660", "4147", "5402"]}
                ],
                "instructions": {
                    "start_point": "Ask the learner to recognize numbers from Level 4",
                    "flow_chart": [
                        {"step": "Level 4 Assessment", "condition": "If at least 4 correct", "action": "Ask the learner to recognize numbers from Level 3", "next_step": "Level 3 Assessment"},
                        {"step": "Level 4 Assessment", "condition": "If less than 4 correct", "outcome": "Mark the learner at 4-digit", "end_assessment_path": True},
                        {"step": "Level 3 Assessment", "condition": "If at least 4 correct", "action": "Ask the learner to recognize numbers from Level 2", "next_step": "Level 2 Assessment"},
                        {"step": "Level 3 Assessment", "condition": "If less than 4 correct", "outcome": "Mark the learner at 3-digit", "end_assessment_path": True},
                        {"step": "Level 2 Assessment", "condition": "If at least 4 correct", "action": "Ask the learner to recognize numbers from Level 1", "next_step": "Level 1 Assessment"},
                        {"step": "Level 2 Assessment", "condition": "If less than 4 correct", "outcome": "Mark the learner at 2-digit", "end_assessment_path": True},
                        {"step": "Level 1 Assessment", "condition": "If at least 4 correct", "outcome": "Mark the learner at 1-digit"},
                        {"step": "Level 1 Assessment", "condition": "If less than 4 correct", "outcome": "Mark the learner at Beginner level", "end_assessment_path": True}
                    ],
                    "post_assessment_action": "Proceed to Part 2: Basic Mathematics Operations",
                    "end_numeracy_assessment_summary": "Mark as Cannot do Addition and Subtraction, Multiplication and Division"
                }
            },
            {
                "name": "Part 2: Basic Mathematics Operations",
                "sections": [
                    {"type": "ADDITION", "problems": ["63 + 29", "49 + 15"]},
                    {"type": "SUBTRACTION", "problems": ["53 - 27", "84 - 19"]},
                    {"type": "MULTIPLICATION", "problems": ["36 x 2", "49 x 5"]},
                    {"type": "DIVISION", "problems": ["3 | 76", "8 | 93"]}
                ],
                "instructions": {
                    "initial_assessment_addition_subtraction": "Basic Addition & Subtraction Assessment",
                    "addition_rubric": [
                        {"condition": "If 2 correct", "outcome": "Mark as Can do Addition and Subtraction", "next_step": "Proceed to Multiplication & Division Assessment"},
                        {"condition": "If less than 2 correct", "outcome": "Mark as Can do Addition but not Subtraction", "next_step": "Proceed to Multiplication & Division Assessment"}
                    ],
                    "subtraction_rubric": [
                        {"condition": "If 2 correct", "outcome": "Mark as Can do Addition and Subtraction", "next_step": "Proceed to Multiplication & Division Assessment"},
                        {"condition": "If less than 2 correct", "outcome": "Mark as Cannot do Addition and Subtraction", "next_step": "Skip Multiplication & Division Assessment"}
                    ],
                    "initial_assessment_multiplication_division": "Basic Multiplication & Division Assessment",
                    "multiplication_rubric": [
                        {"condition": "If 2 correct", "outcome": "Mark as Can do Multiplication and Division"},
                        {"condition": "If less than 2 correct", "outcome": "Mark as Can do Multiplication but not Division"}
                    ],
                    "division_rubric": [
                        {"condition": "If 2 correct", "outcome": "Mark as Can do Multiplication and Division"},
                        {"condition": "If less than 2 correct", "outcome": "Mark as Cannot do Multiplication and Division"}
                    ],
                    "end_numeracy_assessment_summary": "Mark as Cannot do Multiplication and Division"
                }
            }
        ]
    },
    {
        "tool_id": "Basic Numeracy Assessment Tool-2",
        "set_id": "SET-A/2024",
        "parts": [
            {
                "name": "Part 1: Number Recognition",
                "sections": [
                    {"level": "LEVEL 1", "numbers": ["8", "5", "4", "9", "7", "2"]},
                    {"level": "LEVEL 2", "numbers": ["70", "35", "16", "99", "74", "21"]},
                    {"level": "LEVEL 3", "numbers": ["702", "791", "154", "848", "360", "209"]},
                    {"level": "LEVEL 4", "numbers": ["3258", "5945", "1002", "3456", "8132", "5402"]}
                ],
                "instructions": {
                    "start_point": "Ask the learner to recognize numbers from Level 4",
                    "flow_chart": [
                        {"step": "Level 4 Assessment", "condition": "If at least 4 correct", "action": "Ask the learner to recognize numbers from Level 3", "next_step": "Level 3 Assessment"},
                        {"step": "Level 4 Assessment", "condition": "If less than 4 correct", "outcome": "Mark the learner at 4-digit", "end_assessment_path": True},
                        {"step": "Level 3 Assessment", "condition": "If at least 4 correct", "action": "Ask the learner to recognize numbers from Level 2", "next_step": "Level 2 Assessment"},
                        {"step": "Level 3 Assessment", "condition": "If less than 4 correct", "outcome": "Mark the learner at 3-digit", "end_assessment_path": True},
                        {"step": "Level 2 Assessment", "condition": "If at least 4 correct", "action": "Ask the learner to recognize numbers from Level 1", "next_step": "Level 1 Assessment"},
                        {"step": "Level 2 Assessment", "condition": "If less than 4 correct", "outcome": "Mark the learner at 2-digit", "end_assessment_path": True},
                        {"step": "Level 1 Assessment", "condition": "If at least 4 correct", "outcome": "Mark the learner at 1-digit"},
                        {"step": "Level 1 Assessment", "condition": "If less than 4 correct", "outcome": "Mark the learner at Beginner level", "end_assessment_path": True}
                    ],
                    "post_assessment_action": "Proceed to Part 2: Basic Mathematics Operations",
                    "end_numeracy_assessment_summary": "Mark as Cannot do Addition and Subtraction, Multiplication and Division"
                }
            },
            {
                "name": "Part 2: Basic Mathematics Operations",
                "sections": [
                    {"type": "ADDITION", "problems": ["64 + 27", "39 + 15"]},
                    {"type": "SUBTRACTION", "problems": ["94 - 57", "56 - 29"]},
                    {"type": "MULTIPLICATION", "problems": ["36 x 5", "29 x 3"]},
                    {"type": "DIVISION", "problems": ["5 | 57", "2 | 63"]}
                ],
                "instructions": {
                    "initial_assessment_addition_subtraction": "Basic Addition & Subtraction Assessment",
                    "addition_rubric": [
                        {"condition": "If 2 correct", "outcome": "Mark as Can do Addition and Subtraction", "next_step": "Proceed to Multiplication & Division Assessment"},
                        {"condition": "If less than 2 correct", "outcome": "Mark as Can do Addition but not Subtraction", "next_step": "Proceed to Multiplication & Division Assessment"}
                    ],
                    "subtraction_rubric": [
                        {"condition": "If 2 correct", "outcome": "Mark as Can do Addition and Subtraction", "next_step": "Proceed to Multiplication & Division Assessment"},
                        {"condition": "If less than 2 correct", "outcome": "Mark as Cannot do Addition and Subtraction", "next_step": "Skip Multiplication & Division Assessment"}
                    ],
                    "initial_assessment_multiplication_division": "Basic Multiplication & Division Assessment",
                    "multiplication_rubric": [
                        {"condition": "If 2 correct", "outcome": "Mark as Can do Multiplication and Division"},
                        {"condition": "If less than 2 correct", "outcome": "Mark as Can do Multiplication but not Division"}
                    ],
                    "division_rubric": [
                        {"condition": "If 2 correct", "outcome": "Mark as Can do Multiplication and Division"},
                        {"condition": "If less than 2 correct", "outcome": "Mark as Cannot do Multiplication and Division"}
                    ],
                    "end_numeracy_assessment_summary": "Mark as Cannot do Multiplication and Division"
                }
            }
        ]
    },
    {
        "tool_id": "Basic Numeracy Assessment Tool-3",
        "set_id": "SET-A/2024",
        "parts": [
            {
                "name": "Part 1: Number Recognition",
                "sections": [
                    {"level": "LEVEL 1", "numbers": ["1", "6", "9", "5", "3", "7"]},
                    {"level": "LEVEL 2", "numbers": ["16", "28", "41", "50", "74", "29"]},
                    {"level": "LEVEL 3", "numbers": ["318", "603", "500", "741", "979", "862"]},
                    {"level": "LEVEL 4", "numbers": ["2258", "9573", "1025", "7000", "4147", "5009"]}
                ],
                "instructions": {
                    "start_point": "Ask the learner to recognize numbers from Level 4",
                    "flow_chart": [
                        {"step": "Level 4 Assessment", "condition": "If at least 4 correct", "action": "Ask the learner to recognize numbers from Level 3", "next_step": "Level 3 Assessment"},
                        {"step": "Level 4 Assessment", "condition": "If less than 4 correct", "outcome": "Mark the learner at 4-digit", "end_assessment_path": True},
                        {"step": "Level 3 Assessment", "condition": "If at least 4 correct", "action": "Ask the learner to recognize numbers from Level 2", "next_step": "Level 2 Assessment"},
                        {"step": "Level 3 Assessment", "condition": "If less than 4 correct", "outcome": "Mark the learner at 3-digit", "end_assessment_path": True},
                        {"step": "Level 2 Assessment", "condition": "If at least 4 correct", "action": "Ask the learner to recognize numbers from Level 1", "next_step": "Level 1 Assessment"},
                        {"step": "Level 2 Assessment", "condition": "If less than 4 correct", "outcome": "Mark the learner at 2-digit", "end_assessment_path": True},
                        {"step": "Level 1 Assessment", "condition": "If at least 4 correct", "outcome": "Mark the learner at 1-digit"},
                        {"step": "Level 1 Assessment", "condition": "If less than 4 correct", "outcome": "Mark the learner at Beginner level", "end_assessment_path": True}
                    ],
                    "post_assessment_action": "Proceed to Part 2: Basic Mathematics Operations",
                    "end_numeracy_assessment_summary": "Mark as Cannot do Addition and Subtraction, Multiplication and Division"
                }
            },
            {
                "name": "Part 2: Basic Mathematics Operations",
                "sections": [
                    {"type": "ADDITION", "problems": ["37 + 18", "58 + 25"]},
                    {"type": "SUBTRACTION", "problems": ["76 - 37", "96 - 29"]},
                    {"type": "MULTIPLICATION", "problems": ["46 x 5", "39 x 2"]},
                    {"type": "DIVISION", "problems": ["4 | 89", "3 | 79"]}
                ],
                "instructions": {
                    "initial_assessment_addition_subtraction": "Basic Addition & Subtraction Assessment",
                    "addition_rubric": [
                        {"condition": "If 2 correct", "outcome": "Mark as Can do Addition and Subtraction", "next_step": "Proceed to Multiplication & Division Assessment"},
                        {"condition": "If less than 2 correct", "outcome": "Mark as Can do Addition but not Subtraction", "next_step": "Proceed to Multiplication & Division Assessment"}
                    ],
                    "subtraction_rubric": [
                        {"condition": "If 2 correct", "outcome": "Mark as Can do Addition and Subtraction", "next_step": "Proceed to Multiplication & Division Assessment"},
                        {"condition": "If less than 2 correct", "outcome": "Mark as Cannot do Addition and Subtraction", "next_step": "Skip Multiplication & Division Assessment"}
                    ],
                    "initial_assessment_multiplication_division": "Basic Multiplication & Division Assessment",
                    "multiplication_rubric": [
                        {"condition": "If 2 correct", "outcome": "Mark as Can do Multiplication and Division"},
                        {"condition": "If less than 2 correct", "outcome": "Mark as Can do Multiplication but not Division"}
                    ],
                    "division_rubric": [
                        {"condition": "If 2 correct", "outcome": "Mark as Can do Multiplication and Division"},
                        {"condition": "If less than 2 correct", "outcome": "Mark as Cannot do Multiplication and Division"}
                    ],
                    "end_numeracy_assessment_summary": "Mark as Cannot do Multiplication and Division"
                }
            }
        ]
    }
]


# ==========================================
# 2. HARDCODED LITERACY DATA
# ==========================================
LITERACY_DATA = [
    {
        "tool_id": "TOOL - 1",
        "title": "BASIC LITERACY ASSESSMENT (CHITONGA) TOOL - 1",
        "sections": {
            "letter_sounds": ["I", "b", "p", "k", "a", "j", "e", "m", "u", "s"],
            "words": [
                {"word": "nkuni", "paired_word": "madeede"},
                {"word": "cula", "paired_word": "bbodela"},
                {"word": "uluka", "paired_word": "sondela"},
                {"word": "mango", "paired_word": "bona"}
            ],
            "simple_paragraph": "Chipo a Mooya bajika cisyu cabuntele. Bajikila mucibiya cipati cijikliwa cisyu. Cisyu cijikilwa mucibiya cilanona. Balayanda kulya cisyu cijikliwa muciblya",
            "story": "Micelo yamusyokwe mibotu kapati. Ku Bbatoka kulajanika misyobo yamicelo yaandeene. Imwi ili mbull masuku amucinga-cinga. Bamaalumi, bamakalntu abana balaunka musyokwe kukubwezelela micelo eeyl. Imwi micelo balalya, Imwi balasambala. Eeyo njobasambaia, mali ngobajana balaabelesya munzila zyinji. Amwi ngakuula zylsani, mabbusu amabbuku aabana babo. Amwi ngakuula busu acisyu. Bantu banji basimweenda nzila balalkkomanina kwillya micelo eeyi nkaambo ilabapa busani bubotu mumibili yabo."
        }
    },
    {
        "tool_id": "TOOL - 2",
        "title": "BASIC LITERACY ASSESSMENT (CHITONGA) TOOL - 2",
        "sections": {
            "letter_sounds": ["p", "l", "n", "w", "t", "h", "y", "i", "b", "z"],
            "words": [
                {"word": "cinkuli", "paired_word": "pandula"},
                {"word": "bbuku", "paired_word": "busu"},
                {"word": "masamu", "paired_word": "nzoka"},
                {"word": "mpongo", "paired_word": "uluka"}
            ],
            "simple_paragraph": "Baama abataata mbalimi bankutwe. Mbewu yabo III kunze ananda. Mumbewu kull madeede, hhanyisi akkabicci. Zyabizwa zyisyango eezyi tulalya akusambala.",
            "story": "Haamakalu wakali mulombwana mubotu moyo. Wakali kukkala mumunzi mwa Dyambe. Bantu banji bakali kumuyanda kapati. Mumwezi wa Kunkumunamasamu, wakaciswa kapati. Bantu bamumunzi bakali kumuswaya kapati ciindi naakali kuciswa. Bakali kumutolela zyakulya zyandeene-andeene mbull cinkwa, cibwantu, mukupa amabbanana. Bamwi bakapa nombe, mpongo a nkuku zyakuti asilisigwe. Mukubaa coolwe, nikwakainda mvwiki zyobilo wakapona. Bantu bakakkomana kapati. Ncobeni Haamakalu bantu bakall kumuyanda citaambiki."
        }
    },
    {
        "tool_id": "TOOL - 3",
        "title": "BASIC LITERACY ASSESSMENT (CHITONGA) TOOL - 3",
        "sections": {
            "letter_sounds": ["k", "b", "n", "f", "s", "c", "g", "u", "m", "p"],
            "words": [
                {"word": "mupika", "paired_word": "nyabo"},
                {"word": "jilo", "paired_word": "sanduka"},
                {"word": "nkapu", "paired_word": "koona"},
                {"word": "hheete", "paired_word": "ngoma"}
            ],
            "simple_paragraph": "Bana basimbi basobana bbola. Basobana bbola lyamaulu mubbuwa lyacikolo. Balayanda kusobana bbola lyoonse bakotoka. Balakkomana kapati ciindi nobasobana bbola eell.",
            "story": "Mbeba akaaze bakali balongwe. Bakali kukkala mumasena andeene. Bumwi buzuba, bakaswaangana kumulonga kabayanda kunywa meenda. Kaaze wakaambila mbeba kuti, \"Ndime etisaangune kunywa meenda\". Ayalo mbeba yakati, \"Peepel Ndime etisaangune\". Mpoona awo, bakatalika kuzwangana. Kaaze wakanyema kapati akwlisotokela mbeba. Mbeba yakatijila mubwina, kwakacaala buyo mucila anze. Kaaze wakajata mucila mane wakosoka. Mbeba yakayoowa kapati. Nkekaambo kaako, mbeba asunu ncoikkalila mubwina anomazuba."
        }
    }
]


# ==========================================
# 3. HARDCODED RECORDS DATA
# ==========================================
RECORDS_DATA = {
    "assessment_system_name": "Educational Compliance and Assessment System",
    "assessment_category_definitions": [
        {"id": "lang_beginner", "name": "Beginner", "category": "Local Language", "description": "Local Language Beginner level proficiency.", "data_type_student": "boolean", "data_type_summary": "integer"},
        {"id": "lang_letter", "name": "Letter", "category": "Local Language", "description": "Local Language Letter recognition.", "data_type_student": "boolean", "data_type_summary": "integer"},
        {"id": "lang_word", "name": "Word", "category": "Local Language", "description": "Local Language Word recognition.", "data_type_student": "boolean", "data_type_summary": "integer"},
        {"id": "lang_paragraph", "name": "Paragraph", "category": "Local Language", "description": "Local Language Paragraph comprehension.", "data_type_student": "boolean", "data_type_summary": "integer"},
        {"id": "lang_story", "name": "Story", "category": "Local Language", "description": "Local Language Story comprehension.", "data_type_student": "boolean", "data_type_summary": "integer"},
        {"id": "num_rec_beginner", "name": "Beginner", "category": "Number Recognition", "description": "Number Recognition Beginner level.", "data_type_student": "boolean", "data_type_summary": "integer"},
        {"id": "num_rec_1_digit", "name": "1-digit recognition (1 to 9)", "category": "Number Recognition", "description": "Recognizes 1-digit numbers (1-9).", "data_type_student": "boolean", "data_type_summary": "integer"},
        {"id": "num_rec_2_digit", "name": "2-digit recognition (10-99)", "category": "Number Recognition", "description": "Recognizes 2-digit numbers (10-99).", "data_type_student": "boolean", "data_type_summary": "integer"},
        {"id": "num_rec_3_digit", "name": "3-digit recognition (100-999)", "category": "Number Recognition", "description": "Recognizes 3-digit numbers (100-999).", "data_type_student": "boolean", "data_type_summary": "integer"},
        {"id": "num_rec_4_digit", "name": "4-digit recognition (1000 to 9999)", "category": "Number Recognition", "description": "Recognizes 4-digit numbers (1000-9999).", "data_type_student": "boolean", "data_type_summary": "integer"},
        {"id": "ops_cannot_add_sub", "name": "Cannot do Add. Or Sub.", "category": "Operations", "description": "Cannot perform Addition or Subtraction.", "data_type_student": "boolean", "data_type_summary": "integer"},
        {"id": "ops_can_add_not_sub", "name": "Can do Add. But not Sub.", "category": "Operations", "description": "Can perform Addition but not Subtraction.", "data_type_student": "boolean", "data_type_summary": "integer"},
        {"id": "ops_can_add_sub", "name": "Can do Add. And Sub.", "category": "Operations", "description": "Can perform Addition and Subtraction.", "data_type_student": "boolean", "data_type_summary": "integer"},
        {"id": "ops_cannot_mul_div", "name": "Cannot do Mul. Or Div.", "category": "Operations", "description": "Cannot perform Multiplication or Division.", "data_type_student": "boolean", "data_type_summary": "integer"},
        {"id": "ops_can_mul_not_div", "name": "Can do Mul. But not Div.", "category": "Operations", "description": "Can perform Multiplication but not Division.", "data_type_student": "boolean", "data_type_summary": "integer"},
        {"id": "ops_can_mul_div", "name": "Can do Mul. And Div.", "category": "Operations", "description": "Can perform Multiplication and Division.", "data_type_student": "boolean", "data_type_summary": "integer"}
    ],
    "document_types": [
        {
            "document_id": "grade_5_assessment_record_sheet",
            "name": "Grade 5 Assessment Record Sheet for Teachers",
            "description": "Individual student assessment record sheet for Grade 5, tracking progress across Baseline, Midline, and Endline cycles.",
            "applies_to_grades": [5]
        },
        {
            "document_id": "grade_3_5_school_summary_sheet",
            "name": "Grade 3-5 School Summary Sheet",
            "description": "School-level summary of assessment data for Grades 3, 4, and 5.",
            "applies_to_grades": [3, 4, 5]
        }
    ]
}


# ==========================================
# 4. HELPER FUNCTIONS
# ==========================================
def get_numeracy_tool(tool_id: str):
    if isinstance(NUMERACY_DATA, list):
        for tool in NUMERACY_DATA:
            if tool.get("tool_id") == tool_id:
                return tool
    return None

def get_official_record_categories(category_name: str):
    categories = []
    definitions = RECORDS_DATA.get("assessment_category_definitions", [])
    for cat in definitions:
        if cat.get("category") == category_name:
            categories.append({
                "id": cat.get("id"),
                "name": cat.get("name")
            })
    return categories