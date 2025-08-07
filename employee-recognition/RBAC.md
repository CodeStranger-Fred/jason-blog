Access Control & Role-Based Visibility Model
This document outlines the access control and visibility logic implemented in the Employee Recognition GraphQL API.

Role-Based Access Levels
We define four user roles with increasing privileges:
 
Role	             Description	        Permissions Summary
EMPLOYEE	         Regular user	        Can send and view recognitions involving self
MANAGER	             Team lead	            Can access team-level analytics and recognitions
HR	                 Human Resources staff	Can access organization-wide analytics
ADMIN	             System administrator	Full access to all API operations and data

Visibility Levels for Recognitions
Each recognition can be tagged with a visibility level that controls who can see it:

Visibility	         Description	                                                  Who Can View
PUBLIC	             Visible to everyone	                                          All authenticated users
PRIVATE	             Only visible to sender and recipient	                          Sender, recipient
ANONYMOUS	         Sender hidden; only visible to recipient (no sender metadata)	  Recipient only
DELETED	             Soft-deleted recognitions	                                      Hidden from all users (except DB)

Access Control Rules
Recognition Access
Users can only view: PUBLIC recognitions; Recognitions where they are sender or recipient

Users can only update/delete: Recognitions they sent (if not ANONYMOUS)

Analytics Access
MANAGER+ roles can: View team stats (count, top keywords); See trends of recognitions over time within their team

HR+ roles can: View organization-wide stats and keyword analytics

Subscription Access
Subscriptions are filtered by:

RECOGNITION_RECEIVED: only for the specific recipient
&& 
RECOGNITION_CREATED: broadcasts only public recognitions



These visibility rules are enforced in all query and retrieval endpoints.

