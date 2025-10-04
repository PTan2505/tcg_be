/**
 * Test file for demonstrating the tagging functionality
 * 
 * This file shows how the new tagging system works:
 * 
 * 1. Text parsing: @username extraction from content
 * 2. Friend verification: Only friends can be tagged (with exceptions for replies)
 * 3. Automatic notifications: Tagged users receive notifications
 * 4. Context-aware tagging: Different rules for posts vs comments vs replies
 * 
 * Usage Examples:
 * 
 * 1. Create a post with tags:
 *    POST /posts
 *    {
 *      "content": "Hey @john_doe and @jane_smith, check this out!"
 *    }
 *    
 * 2. Create a comment with tags:
 *    POST /posts/:postId/comments
 *    {
 *      "content": "Great point @username!"
 *    }
 *    
 * 3. Reply to a comment with tags:
 *    POST /posts/:postId/comments
 *    {
 *      "content": "@postowner @commentowner and @friend thanks for the discussion!",
 *      "parentComment": "commentId"
 *    }
 *    
 * 4. Get taggable users for suggestions:
 *    GET /posts/taggable-users?type=post
 *    GET /posts/taggable-users?type=reply&postId=123&parentCommentId=456
 * 
 * Tagging Rules:
 * 
 * - Posts: Can only tag friends
 * - Comments: Can only tag friends  
 * - Replies: Can tag friends + post owner + comment owner
 * 
 * Features:
 * 
 * ✅ Text parsing with regex: /@([a-zA-Z0-9_]+)/g
 * ✅ Friend verification through friendship relationships
 * ✅ Automatic notification sending to tagged users
 * ✅ Context-aware permissions (post/comment/reply)
 * ✅ Frontend API for getting taggable users
 * ✅ Prevention of self-tagging notifications
 * ✅ Duplicate notification prevention (24hr window)
 * ✅ Multiple user tagging support
 * ✅ Integration with existing post/comment creation
 * 
 */

const TaggingSystemExamples = {
  
  // Example 1: Create post with tags
  createPostWithTags: {
    method: "POST",
    endpoint: "/posts",
    body: {
      content: "Amazing card pull today! @pokemon_master @card_collector what do you think? 🔥",
      privacy: "public"
    },
    expectedBehavior: [
      "Extract usernames: pokemon_master, card_collector",
      "Verify both users are friends with post author",
      "Create post with valid tagged user IDs", 
      "Send notifications to tagged users",
      "Invalid usernames are filtered out silently"
    ]
  },

  // Example 2: Reply to comment with extended tagging
  createReplyWithTags: {
    method: "POST", 
    endpoint: "/posts/123/comments",
    body: {
      content: "@postowner @commentauthor @friend1 great discussion everyone!",
      parentComment: "comment123"
    },
    expectedBehavior: [
      "Extract usernames: postowner, commentauthor, friend1", 
      "Allow tagging post owner (even if not friend)",
      "Allow tagging comment author (even if not friend)",
      "Verify friend1 is in friends list",
      "Send notifications to all valid tagged users"
    ]
  },

  // Example 3: Get taggable users for frontend
  getTaggableUsers: {
    method: "GET",
    endpoint: "/posts/taggable-users?type=reply&postId=123&parentCommentId=456",
    expectedResponse: {
      success: true,
      data: [
        { _id: "user1", username: "friend1", firstName: "John", lastName: "Doe" },
        { _id: "user2", username: "postowner", firstName: "Jane", lastName: "Smith" },
        { _id: "user3", username: "commentauthor", firstName: "Bob", lastName: "Wilson" }
      ]
    }
  }

};

export default TaggingSystemExamples;