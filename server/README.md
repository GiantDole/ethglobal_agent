# TODO

- [ - ] Add a middleware to check if the user is authenticated.
- [ X ] Add a route to register the user and return the first question.
- [  ] Add the user to a database (supabase)
- [  ] Add a route to answer a question and return the next question.

## API Documentation

All endpoints in this backend are prefixed with `/api`.

### 1. **User Registration**
**Endpoint:** `POST /api/register`

**Description:**  
Registers a new or existing user that has logged in via [Privy](https://www.privy.io/). This endpoint:
  - Validates the user's access token (stored in the `privy-token` cookie).
  - Retrieves the user's profile data from the identity token (stored in the `idToken` cookie).
  - Creates or resets a session in Redis.
  - Stores (or updates) the user data in Supabase.
  - Returns a first question or prompt (e.g., "What is your first question?").

**Authentication:**  
- Requires a valid `privy-token` cookie (and optionally an `idToken` cookie).

**Request Body:**  
No request body; the endpoint relies on cookies.

**Response Example (HTTP 200):**  
```json
{
  "question": "What is your first question?"
}
```

**Error Responses (HTTP 4xx/5xx):**  
Appropriate error messages if authentication fails or a server error occurs.

### 2. **List All Projects**
**Endpoint:** `GET /api/projects`

**Description:**  
Retrieves a list of all existing projects from the Launchpad along with metadata such as project name, status, and description.

**Authentication:**  
Optional, if projects are public. Otherwise, apply JWT/Privy-based authentication.

**Request Example:**  
```
GET /api/projects
```

**Response Example (HTTP 200):**  
```json
[
  {
    "id": "123",
    "name": "Project Alpha",
    "description": "A cutting-edge initiative for AI research.",
    "status": "active"
  },
  {
    "id": "456",
    "name": "Project Beta",
    "description": "An advanced blockchain-based web app.",
    "status": "development"
  }
]
```

### 3. **Get Project Info**
**Endpoint:** `GET /api/project/:id`

**Description:**  
Retrieves metadata and high-level status for a specific project identified by its `id`.

**Path Parameter:**  
- `id` – The unique identifier of the project.

**Example:**  
```
GET /api/project/123
```

**Response Example (HTTP 200):**  
```json
{
  "id": "123",
  "name": "Project Alpha",
  "description": "A cutting-edge initiative for AI research.",
  "status": "active",
  "createdAt": "2023-10-08T12:00:00.000Z"
}
```

### 4. **Project Interaction**
**Endpoint:** `POST /api/project/:id/interaction`

**Description:**  
Handles interactions with a project's bouncer (i.e., a question-based flow). It can:
  - Return the first question if no state is set.
  - Accept an answer to the previous question and return the next question or result.

**Path Parameter:**  
- `id` – The unique project identifier.

**Request Body Example:**  
```json
{
  "previousAnswer": "I am interested in joining this project."
}
```

**Response Example (HTTP 200):**  
```json
{
  "question": "Why do you think you are a good fit for this community?"
}
```

## Potential Additional Endpoints

1. **Health Check**
   - `GET /api/health` – Returns a simple status message (e.g., `{ "status": "ok" }`) for uptime monitoring.

2. **User Profile**
   - `GET /api/user/me` – Retrieves detailed profile information for the currently authenticated user.

3. **Logout/Session Invalidation**
   - `POST /api/logout` – Clears the user's session in Redis and optionally removes authentication cookies.

## General Notes and Recommendations

- **Authentication Flow:** Use Privy cookies (`privy-token` and `idToken`) for authentication. Additional routes can be protected using JWT middleware if needed.

- **Data Storage:** User data is stored/updated in Supabase while session data is maintained in Redis. Additional user progress can also be stored in Supabase.

- **Logging and Error Handling:**  
  Use [Pino logger](https://getpino.io/) for logging. Make sure to handle errors gracefully using try/catch blocks to avoid server crashes.

- **Next Steps:**  
  Flesh out each endpoint's logic and validations. Integrate the bouncer flow in `/api/project/:id/interaction` and consider adding endpoints for user profile and logout as the project evolves.

## Database Schema

Below are the recommended tables in Supabase to support user registration, project listings, and user-project interactions.

### 1. **Users Table**

**Columns:**
- **id** (primary key, UUID or serial integer)  
- **wallet_address** (text, unique or indexed if you want quick lookups)  
- **registration_date** (timestamp, defaults to current timestamp)  
- **last_active_date** (timestamp)  

**Description:**  
Stores basic user information. The `wallet_address` may be null if not relevant to some authentication flows, but typically you'd store whichever blockchain address the user uses. You could also add columns like `email` or `username` if needed.

### 2. **Projects Table**

**Columns:**
- **id** (primary key, UUID or serial integer)  
- **name** (text)  
- **author** (text)  
- **short_description** (text)  
- **evm_token_address** (text)  
- **created_at** (timestamp, defaults to current timestamp)  
- **updated_at** (timestamp, can be updated on edits)  
- Additional metadata fields as needed (e.g., `status`, `category`, etc.)

**Description:**  
Each row represents a unique project on your launchpad. You can store any metadata you'd like here, such as token addresses, statuses, or categories.

### 3. **Interaction Table**

**Columns:**
- **id** (primary key, UUID or serial integer)  
- **user_id** (foreign key referencing `users.id`)  
- **project_id** (foreign key referencing `projects.id`)  
- **q_and_a** (jsonb) – A JSON object storing question-answer pairs  
- **access_granted** (boolean) – Indicates whether the final result of this interaction allowed the user access  
- **created_at** (timestamp, defaults to current timestamp)  

**Description:**  
This table tracks user interactions with a specific project. Each row can contain a JSON object with the Q&A flow, whether the user was ultimately granted access, and a timestamp. By linking `user_id` and `project_id`, you maintain a clear reference to both the user and the project.