const express = require('express');
const { engine } = require('express-handlebars');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const mysql = require('mysql2');

const app = express();
const PORT = 3000;

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

const db = mysql.createConnection({
    host: 'serverdbp2.mysql.database.azure.com',
    user: 'useradmin',
    password: 'admin@123',
    database: 'db_viniciusoliveiradasnevesrodrigues'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Conectado ao MySQL');
});

app.get('/', (req, res) => {
    res.render('form');
});

app.get('/alunos', (req, res) => {
  const query = 'SELECT id_aluno, nome_completo, usuario_acesso, email_aluno, observacao, data_cadastro FROM alunos ORDER BY data_cadastro DESC';

  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erro ao buscar alunos no banco de dados.');
    }

    res.render('lista_alunos', { alunos: results });
  });
});


app.post('/alunos', [
    body('nome_completo').notEmpty().withMessage('Nome é obrigatório.'),
    body('usuario_acesso').notEmpty().withMessage('Usuário é obrigatório.'),
    body('email_aluno').isEmail().withMessage('E-mail inválido.'),
    body('senha').notEmpty().withMessage('Senha é obrigatória.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render('form', {
            errors: errors.array(),
            old: req.body
        });
    }

    const { nome_completo, usuario_acesso, senha, email_aluno, observacao } = req.body;

    try {
        const senha_hash = await bcrypt.hash(senha, 10);

        const sql = 'INSERT INTO alunos (nome_completo, usuario_acesso, senha_hash, email_aluno, observacao) VALUES (?, ?, ?, ?, ?)';
        db.query(sql, [nome_completo, usuario_acesso, senha_hash, email_aluno, observacao || null], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).render('form', {
                        db_error: 'Usuário ou e-mail já cadastrados.',
                        old: req.body
                    });
                }
                return res.status(500).render('form', {
                    db_error: 'Erro interno no servidor.',
                    old: req.body
                });
            }
            res.render('form', { success: 'Aluno cadastrado com sucesso!' });
        });
    } catch (error) {
        res.status(500).render('form', { db_error: 'Erro ao processar a senha.' });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server rodando na porta ${port}`);
});
