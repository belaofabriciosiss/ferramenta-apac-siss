# Exportação Arquivo APAC

Ferramenta desenvolvida em React para geração do arquivo APAC com dados extraídos do sistema SISS.

## Estrutura do Projeto
Este projeto foi estruturado com **React** e **Vite**, preparado para ser hospedado gratuitamente na **Vercel** através de integração contínua com o **GitHub**.

## Como publicar no GitHub e Vercel sem usar linha de comando

Como você não possui ferramentas de desenvolvimento locais (como Node.js ou Git) instaladas no momento, você pode publicar o projeto arrastando os arquivos diretamente pela interface web:

### Passo 1: Enviar para o GitHub
1. Acesse [GitHub](https://github.com/) e crie uma conta (se ainda não tiver).
2. Clique no botão **New** para criar um novo repositório e dê o nome de `exportacao-apac` (ou qualquer outro nome). Deixe-o como Public ou Private. Não precisa adicionar README pelo GitHub (deixe as caixas em branco).
3. Na próxima tela, você verá a opção **"uploading an existing file"** (fazer upload de um arquivo existente). Clique nesse link.
4. Selecione ou arraste a pasta inteira onde estes arquivos se encontram (ou todos os arquivos soltos incluindo a pasta `src`) diretamente para o seu navegador.
5. Após carregar os arquivos, desça a tela e clique no botão verde **Commit changes**.

### Passo 2: Publicar na Vercel
1. Acesse [Vercel](https://vercel.com/) e faça login utilizando a sua conta do **GitHub**.
2. Na sua tela inicial (Dashboard), clique em **Add New...** e selecione **Project**.
3. A Vercel vai listar os seus repositórios do GitHub. Encontre o `exportacao-apac` que você acabou de criar e clique em **Import**.
4. A próxima tela mostra as configurações do projeto. Por padrão, a Vercel reconhece tudo automaticamente por causa da configuração que foi deixada no repositório (Vite, React).
5. Apenas clique em **Deploy**! A Vercel vai instalar as dependências (`react`, `react-dom`, `xlsx`, `vite`), compilar o projeto e te fornecer uma URL de produção em alguns segundos.

Pronto! Ao final desse processo, você terá um link funcionando perfeitamente que poderá acessar de qualquer lugar e compartilhar com quem quiser.
