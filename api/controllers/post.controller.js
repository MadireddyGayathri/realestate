import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";

export const getPosts = async (req, res) => {
  const query = req.query;

  try {
    const posts = await prisma.post.findMany({
      where: {
        city: query.city || undefined,
        type: query.type || undefined,
        property: query.property || undefined,
        bedroom: query.bedroom ? parseInt(query.bedroom) : undefined,
        price: {
          gte: query.minPrice ? parseInt(query.minPrice) : undefined,
          lte: query.maxPrice ? parseInt(query.maxPrice) : undefined,
        },
      },
    });

    res.status(200).json(posts);
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).json({ message: "Failed to get posts" });
  }
};




export const getPost = async (req, res) => {
  const id = req.params.id;

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        postDetail: true,
        user: {
          select: {
            username: true,
            avatar: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const token = req.cookies?.token;

    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET_KEY);

        const saved = await prisma.savedPost.findUnique({
          where: {
            userId_postId: {
              postId: id,
              userId: payload.id,
            },
          },
        });

        return res.status(200).json({ ...post, isSaved: !!saved });
      } catch (err) {
        console.error("JWT Verification Error:", err);
      }
    }

    res.status(200).json({ ...post, isSaved: false });
  } catch (err) {
    console.error("Error fetching post:", err);
    res.status(500).json({ message: "Failed to get post" });
  }
};



export const addPost = async (req, res) => {
  const body = req.body;
  const tokenUserId = req.userId;

  try {
    const newPost = await prisma.post.create({
      data: {
        ...body.postData,
        userId: tokenUserId,
        postDetail: {
          create: body.postDetail,
        },
      },
    });
    res.status(200).json(newPost);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to create post" });
  }
};

export const updatePost = async (req, res) => {
  const id = req.params.id; // The post ID
  const { title, price } = req.body; // Extract new data from the request body
  const tokenUserId = req.userId; // Authenticated user ID

  try {
    // Find the post by ID
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.userId !== tokenUserId) {
      return res.status(403).json({ message: "Not Authorized!" });
    }

    // Update the post
    const updatedPost = await prisma.post.update({
      where: { id },
      data: { title, price },
    });

    return res.status(200).json(updatedPost);
  } catch (err) {
    console.error("Error updating post:", err);
    return res.status(500).json({ message: "Failed to update post" });
  }
};



export const deletePost =async function deletePost(req, res) {
  const { id } = req.params; // Get the post ID from the request.

  try {
      // Delete the associated PostDetail
      await prisma.postDetail.deleteMany({
          where: { postId: id },
      });

      // Delete the Post
      await prisma.post.delete({
          where: { id },
      });

      res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to delete post", error });
  }
}
